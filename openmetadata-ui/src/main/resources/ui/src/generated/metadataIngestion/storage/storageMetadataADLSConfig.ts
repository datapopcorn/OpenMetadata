/*
 *  Copyright 2024 Collate.
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
/**
 * Storage Metadata Manifest file ADLS path config.
 */
export interface StorageMetadataADLSConfig {
    prefixConfig:    StorageMetadataBucketDetails;
    securityConfig?: AzureCredentials;
}

/**
 * Details of the bucket where the storage metadata manifest file is stored
 */
export interface StorageMetadataBucketDetails {
    /**
     * Name of the top level container where the storage metadata file is stored
     */
    containerName: string;
    /**
     * Path of the folder where the storage metadata file is stored. If the file is at the root,
     * you can keep it empty.
     */
    objectPrefix?: string;
}

/**
 * Azure Cloud Credentials
 */
export interface AzureCredentials {
    /**
     * Account Name of your storage account
     */
    accountName?: string;
    /**
     * Your Service Principal App ID (Client ID)
     */
    clientId?: string;
    /**
     * Your Service Principal Password (Client Secret)
     */
    clientSecret?: string;
    /**
     * Scopes to get access token, for e.g. api://6dfX33ab-XXXX-49df-XXXX-3459eX817d3e/.default
     */
    scopes?: string;
    /**
     * Tenant ID of your Azure Subscription
     */
    tenantId?: string;
    /**
     * Key Vault Name
     */
    vaultName?: string;
}
