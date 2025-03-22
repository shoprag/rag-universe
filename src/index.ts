import { RAG, JsonObject } from '@shoprag/core';

export default class UniverseRAG implements RAG {
    private serverUrl: string;
    private universe: string;
    private token: string;
    private config: JsonObject;

    constructor(config: JsonObject) {
        this.config = config;
    }

    requiredCredentials(): { [credentialName: string]: string } {
        const serverUrl = this.config['serverUrl'] as string | undefined;
        if (!serverUrl) {
            throw new Error('serverUrl must be specified in the config to determine the credential name');
        }
        const credentialName = this.generateCredentialName(serverUrl);
        return {
            [credentialName]: `The bearer token for the Universe server. Contact the admins or use ${serverUrl} to obtain access.`
        };
    }

    async init(credentials: { [key: string]: string }, config: JsonObject): Promise<void> {
        if (!config['serverUrl']) {
            throw new Error('serverUrl must be specified in the config');
        }
        if (!config['universe']) {
            throw new Error('universe must be specified in the config');
        }
        const credentialName = this.generateCredentialName(config['serverUrl'] as string);
        if (!credentials[credentialName]) {
            throw new Error(`Credential "${credentialName}" is required`);
        }
        this.serverUrl = config['serverUrl'] as string;
        this.universe = config['universe'] as string;
        this.token = credentials[credentialName];
    }

    private generateCredentialName(serverUrl: string): string {
        // Sanitize serverUrl to create a valid credential name
        return 'universe_token_' + serverUrl.replace(/[^a-zA-Z0-9]/g, '_');
    }

    private async fetchApi(endpoint: string, method: string, body?: any): Promise<any> {
        const url = `${this.serverUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`,
        };
        const options: RequestInit = {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        };
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`API request to ${url} failed: ${response.statusText}`);
        }
        return response.json();
    }

    async addFile(fileId: string, content: string): Promise<void> {
        await this.fetchApi('/emit', 'POST', {
            universe: this.universe,
            thing: { id: fileId, text: content },
        });
    }

    async updateFile(fileId: string, content: string): Promise<void> {
        // Universe API overwrites items with the same ID
        await this.addFile(fileId, content);
    }

    async deleteFile(fileId: string): Promise<void> {
        await this.fetchApi(`/thing/${this.universe}/${fileId}`, 'DELETE');
    }

    async finalize(): Promise<void> {
        // No-op, as Universe API operations are atomic
    }

    async deleteAllFiles(): Promise<void> {
        await this.fetchApi(`/universe/${this.universe}`, 'DELETE');
    }
}