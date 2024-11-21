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
Data Sampler for the PII Workflow
"""
import traceback
from copy import deepcopy
from typing import Optional, cast

from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeMeta

from metadata.generated.schema.entity.data.database import Database
from metadata.generated.schema.entity.data.table import Table
from metadata.generated.schema.entity.services.databaseService import DatabaseConnection
from metadata.generated.schema.entity.services.ingestionPipelines.status import (
    StackTraceError,
)
from metadata.generated.schema.entity.services.serviceType import ServiceType
from metadata.generated.schema.metadataIngestion.databaseServiceAutoClassificationPipeline import (
    DatabaseServiceAutoClassificationPipeline,
)
from metadata.generated.schema.metadataIngestion.workflow import (
    OpenMetadataWorkflowConfig,
)
from metadata.ingestion.api.models import Either
from metadata.ingestion.api.parser import parse_workflow_config_gracefully
from metadata.ingestion.api.step import Step
from metadata.ingestion.api.steps import Processor
from metadata.ingestion.ometa.ometa_api import OpenMetadata
from metadata.profiler.api.models import ProfilerProcessorConfig
from metadata.profiler.orm.converter.base import ometa_to_sqa_orm
from metadata.profiler.source.metadata import ProfilerSourceAndEntity
from metadata.sampler.config import get_config_for_table
from metadata.sampler.models import SampleConfig, SampleData, SamplerResponse
from metadata.sampler.sampler_interface import SamplerInterface
from metadata.utils.constants import NON_SQA_DATABASE_CONNECTIONS
from metadata.utils.profiler_utils import get_context_entities
from metadata.utils.service_spec.service_spec import import_sampler_class


class SamplerProcessor(Processor):
    """Use the profiler interface to fetch the sample data"""

    def __init__(self, config: OpenMetadataWorkflowConfig, metadata: OpenMetadata):
        super().__init__()

        self.config = config
        self.metadata = metadata

        self.source_config: DatabaseServiceAutoClassificationPipeline = cast(
            DatabaseServiceAutoClassificationPipeline,
            self.config.source.sourceConfig.config,
        )  # Used to satisfy type checked
        # We still rely on the orm-processor. We should decouple this in the future
        self.profiler_config = ProfilerProcessorConfig.model_validate(
            self.config.processor.model_dump().get("config")
        )

        self._interface_type: str = config.source.type.lower()
        self.sampler_class = import_sampler_class(
            ServiceType.Database, source_type=self._interface_type
        )

    @property
    def name(self) -> str:
        return "Sampler"

    def _run(self, record: ProfilerSourceAndEntity) -> Either[SamplerResponse]:
        """Fetch the sample data and pass it down the pipeline"""

        try:
            entity = cast(Table, record.entity)
            schema_entity, database_entity, _ = get_context_entities(
                entity=entity, metadata=self.metadata
            )
            service_conn_config = self._copy_service_config(
                self.config, database_entity
            )

            _orm = self._build_table_orm(
                entity, conn_type=str(service_conn_config.type.value)
            )
            sampler_interface: SamplerInterface = self.sampler_class.create(
                service_connection_config=service_conn_config,
                ometa_client=self.metadata,
                entity=entity,
                schema_entity=schema_entity,
                database_entity=database_entity,
                table_config=get_config_for_table(entity, self.profiler_config),
                default_sample_config=SampleConfig(
                    profile_sample=self.source_config.profileSample,
                    profile_sample_type=self.source_config.profileSampleType,
                    sampling_method_type=self.source_config.samplingMethodType,
                ),
                default_sample_data_count=self.source_config.sampleDataCount,
                orm_table=_orm,
            )
            sample_data = SampleData(
                data=sampler_interface.generate_sample_data(),
                store=self.source_config.storeSampleData,
            )

            return Either(
                right=SamplerResponse(
                    table=entity,
                    sample_data=sample_data,
                )
            )

        except Exception as exc:
            return Either(
                left=StackTraceError(
                    name=record.entity.fullyQualifiedName.root,
                    error=f"Unexpected exception processing entity {record.entity.fullyQualifiedName.root}: {exc}",
                    stackTrace=traceback.format_exc(),
                )
            )

    @classmethod
    def create(
        cls,
        config_dict: dict,
        metadata: OpenMetadata,
        pipeline_name: Optional[str] = None,
    ) -> "Step":
        config = parse_workflow_config_gracefully(config_dict)
        return cls(config=config, metadata=metadata)

    def _build_table_orm(
        self, entity: Table, conn_type: str
    ) -> Optional[DeclarativeMeta]:
        """Build the ORM table if needed for the sampler and profiler interfaces"""
        if conn_type not in NON_SQA_DATABASE_CONNECTIONS:
            return ometa_to_sqa_orm(entity, self.metadata, MetaData())
        return None

    def _copy_service_config(
        self, config: OpenMetadataWorkflowConfig, database: Database
    ) -> DatabaseConnection:
        """Make a copy of the service config and update the database name

        Args:
            database (_type_): a database entity

        Returns:
            DatabaseService.__config__
        """
        config_copy = deepcopy(
            config.source.serviceConnection.root.config  # type: ignore
        )
        if hasattr(
            config_copy,  # type: ignore
            "supportsDatabase",
        ):
            if hasattr(config_copy, "database"):
                config_copy.database = database.name.root  # type: ignore
            if hasattr(config_copy, "catalog"):
                config_copy.catalog = database.name.root  # type: ignore

        # we know we'll only be working with DatabaseConnection, we cast the type to satisfy type checker
        config_copy = cast(DatabaseConnection, config_copy)

        return config_copy

    def close(self) -> None:
        """Nothing to close"""
