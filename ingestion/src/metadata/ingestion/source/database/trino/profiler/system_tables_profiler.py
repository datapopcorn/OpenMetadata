#  Copyright 2021 Collate
#  Licensed under the Apache License, Version 2.0 (the "License");
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#  http://www.apache.org/licenses/LICENSE-2.0
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.
"""
System table profiler
"""
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional, Set, Union

from more_itertools import partition
from pydantic import field_validator
from sqlalchemy import Table, text
from sqlalchemy.engine import Engine

from metadata.ingestion.models.custom_pydantic import BaseModel
from metadata.profiler.interface.sqlalchemy.stored_statistics_profiler import (
    StoredStatisticsSource,
)
from metadata.profiler.metrics.core import Metric
from metadata.profiler.metrics.registry import Metrics
from metadata.utils.logger import profiler_logger
from metadata.utils.lru_cache import LRU_CACHE_SIZE, LRUCache
from metadata.utils.ssl_manager import get_ssl_connection

logger = profiler_logger()


class ColumnStats(BaseModel):
    """Based on https://trino.io/docs/current/sql/show-stats.html"""

    column_name: Optional[str] = None
    data_size: Optional[int] = None
    distinct_values_count: Optional[int] = None
    nulls_fraction: Optional[float] = None
    low_value: Optional[Union[int, float, datetime, Decimal]] = None
    high_value: Optional[Union[int, float, datetime, Decimal]] = None

    @field_validator("data_size", mode="before")
    @classmethod
    def data_size_validator(cls, value):
        """Data size validator

        Args:
            value: value
        """
        if value is None:
            return None
        return int(value)


class TableStats(BaseModel):
    row_count: Optional[int] = None
    columns: Dict[str, ColumnStats] = {}


class TrinoStoredStatisticsSource(StoredStatisticsSource):
    """Trino system profile source"""

    metric_stats_map: Dict[Metrics, str] = {
        Metrics.NULL_RATIO: "nulls_fractions",
        Metrics.DISTINCT_COUNT: "distinct_values_count",
        Metrics.ROW_COUNT: "row_count",
        Metrics.MAX: "high_value",
        Metrics.MIN: "low_value",
    }

    metric_stats_by_name: Dict[str, str] = {
        k.name: v for k, v in metric_stats_map.items()
    }

    def get_statistics_metrics(self) -> Set[Metrics]:
        return set(self.metric_stats_map.keys())

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        service_connection_config = kwargs["service_connection_config"]
        self.session: Engine = get_ssl_connection(service_connection_config)
        self.stats_cache = LRUCache(capacity=LRU_CACHE_SIZE)

    def get_column_statistics(
        self, metric: List[Metric], schema: str, table_name: Table, column: str
    ) -> Dict[str, Any]:
        table_stats = self._get_cached_stats(schema, table_name)
        try:
            column_stats = table_stats.columns[column]
        except KeyError:
            raise RuntimeError(
                f"Column {column} not found in table {table_name}. Statistics might be stale or missing."
            )
        result = {
            m.name(): getattr(column_stats, self.metric_stats_by_name[m.name()])
            for m in metric
        }
        result.update(self.get_hybrid_statistics(table_stats, column_stats))
        self.warn_for_missing_stats(schema, table_name, column_stats)
        return result

    def get_table_statistics(
        self, metric: List[Metric], schema: str, table_name: Table
    ) -> dict:
        table_stats = self._get_cached_stats(schema, table_name)
        return {
            m.name(): getattr(table_stats, self.metric_stats_by_name[m.name()])
            for m in metric
        }

    def warn_for_missing_stats(self, schema: str, table: str, stats: BaseModel):
        if (
            isinstance(stats, ColumnStats)
            and all(map(lambda x: x is None, stats.model_dump().values()))
        ) or (
            isinstance(stats, TableStats)
            and all(
                map(
                    lambda x: x is None,
                    [v for k, v in stats.model_dump().items() if k != "columns"],
                )
            )
        ):
            logger.warning(
                'Statistics are missing for table "{schema}.{table}". Profiling might be inaccurate.\n'
                "Gather statistics for the table by running:"
                f"  ANALYZE {schema}.{table}"
            )

    def _get_cached_stats(self, schema: str, table: str) -> TableStats:
        path = f"{schema}.{table}"
        if path in self.stats_cache:
            return self.stats_cache.get(path)
        stats = self._get_db_stats(schema, table)
        self.stats_cache.put(path, stats)
        return stats

    def _get_db_stats(self, schema, table) -> TableStats:
        rows = self.session.execute(text(f'SHOW STATS FOR "{schema}"."{table}"'))
        table_rows, column_rows = map(
            list, partition(lambda row: row.get("column_name"), map(dict, rows))
        )
        if len(table_rows) != 1:
            raise RuntimeError(
                f"Expected one row for table {table}, got {len(table_rows)}"
            )
        table = table_rows[0]
        columns_dict = {
            row.get("column_name"): ColumnStats(**row) for row in column_rows
        }
        return TableStats(row_count=table["row_count"], columns=columns_dict)

    def get_hybrid_statistics(
        self, table_stats: TableStats, column_stats: ColumnStats
    ) -> Dict[str, Any]:
        return {
            # trino stats are in fractions, so we need to convert them to counts (unlike our default profiler)
            Metrics.NULL_COUNT.name: (
                int(table_stats.row_count * column_stats.nulls_fraction)
                if None not in [table_stats.row_count, column_stats.nulls_fraction]
                else None
            ),
        }
