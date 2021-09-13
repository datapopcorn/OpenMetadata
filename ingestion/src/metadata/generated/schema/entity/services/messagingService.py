# generated by datamodel-codegen:
#   filename:  schema/entity/services/messagingService.json
#   timestamp: 2021-09-13T04:07:21+00:00

from __future__ import annotations

from enum import Enum
from typing import List, Optional

from pydantic import AnyUrl, BaseModel, Field, constr

from ...type import basic, schedule


class MessagingServiceType(Enum):
    Kafka = 'Kafka'
    Pulsar = 'Pulsar'


class Brokers(BaseModel):
    __root__: List[str] = Field(
        ...,
        description='Multiple bootstrap addresses for Kafka. Single proxy address for Pulsar.',
    )


class MessagingService(BaseModel):
    id: basic.Uuid = Field(
        ..., description='Unique identifier of this messaging service instance.'
    )
    name: constr(min_length=1, max_length=64) = Field(
        ..., description='Name that identifies this messaging service.'
    )
    serviceType: MessagingServiceType = Field(
        ..., description='Type of messaging service such as Kafka or Pulsar...'
    )
    description: Optional[str] = Field(
        None, description='Description of a messaging service instance.'
    )
    brokers: Brokers = Field(
        ...,
        description='Multiple bootstrap addresses for Kafka. Single proxy address for Pulsar.',
    )
    schemaRegistry: Optional[AnyUrl] = Field(None, description='Schema registry URL.')
    ingestionSchedule: Optional[schedule.Schedule] = Field(
        None, description='Schedule for running metadata ingestion jobs.'
    )
    href: Optional[basic.Href] = Field(
        None,
        description='Link to the resource corresponding to this messaging service.',
    )
