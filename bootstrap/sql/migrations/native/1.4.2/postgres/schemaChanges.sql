ALTER TABLE ingestion_pipeline_entity ADD COLUMN appType VARCHAR(256) GENERATED ALWAYS AS (json -> 'sourceConfig' -> 'config' -> 'appConfig' ->> 'type') STORED NULL;
ALTER TABLE ingestion_pipeline_entity ADD COLUMN pipelineType VARCHAR(256) GENERATED ALWAYS AS (json ->> 'pipelineType') STORED NULL;