import { RAG, JsonObject } from '@shoprag/core';

/**
 * A client for interacting with the Universe server API, implementing the RAG interface.
 * Provides methods to add, update, delete, and manage files in a specified universe.
 */
export default class UniverseRAG implements RAG {
    private serverUrl: string;
    private universe: string;
    private token: string | undefined;

    /**
     * Creates a new UniverseRAG instance with the provided configuration.
     * @param config - Configuration object containing 'serverUrl' and 'universe'.
     * @throws Error if 'serverUrl' is missing or not a valid URL, or if 'universe' is missing or contains invalid characters.
     */
    constructor(config: JsonObject) {
        if (!config['serverUrl']) {
            throw new Error('serverUrl must be specified in the config');
        }
        if (!config['universe']) {
            throw new Error('universe must be specified in the config');
        }
        const serverUrl = config['serverUrl'] as string;
        const universe = config['universe'] as string;

        // Validate serverUrl as a valid URL
        try {
            new URL(serverUrl);
        } catch {
            throw new Error('serverUrl must be a valid URL');
        }

        // Validate universe name per server constraints (alphanumeric and underscores only)
        if (!/^[a-zA-Z0-9_]+$/.test(universe)) {
            throw new Error('universe must be alphanumeric with underscores');
        }

        this.serverUrl = serverUrl;
        this.universe = universe;
    }

    /**
     * Specifies the credentials required to initialize the client.
     * @returns An object mapping credential names to their descriptions.
     */
    requiredCredentials(): { [credentialName: string]: string } {
        const credentialName = this.generateCredentialName(this.serverUrl);
        return {
            [credentialName]: `Obtain the bearer token for the Universe server. Contact the admins or use ${this.serverUrl} to obtain access.`,
        };
    }

    /**
     * Initializes the client with the provided credentials.
     * @param credentials - An object containing the required bearer token.
     * @throws Error if the required credential is missing.
     */
    async init(credentials: { [key: string]: string }): Promise<void> {
        const credentialName = this.generateCredentialName(this.serverUrl);
        if (!credentials[credentialName]) {
            throw new Error(`Credential "${credentialName}" is required`);
        }
        this.token = credentials[credentialName];
    }

    /**
     * Generates a sanitized credential name based on the server URL.
     * @param serverUrl - The server URL to base the credential name on.
     * @returns A string representing the credential name.
     */
    private generateCredentialName(serverUrl: string): string {
        return 'universe_token_' + serverUrl.replace(/[^a-zA-Z0-9]/g, '_');
    }

    /**
     * Handles the response from an API request, parsing success or error data.
     * @param response - The HTTP response from the fetch call.
     * @returns The parsed JSON response if successful.
     * @throws Error with detailed message if the response indicates failure.
     */
    private async handleResponse(response: Response): Promise<any> {
        if (response.ok) {
            return response.json();
        } else {
            let errorMessage = response.statusText;
            try {
                const errorData = await response.json();
                if (errorData.error) {
                    errorMessage = errorData.error;
                } else if (errorData.description) {
                    errorMessage = errorData.description;
                }
            } catch {
                // If JSON parsing fails, fall back to status text
            }
            throw new Error(`API request failed: ${response.status} - ${errorMessage}`);
        }
    }

    /**
     * Makes an API request to the Universe server with retry logic for network errors.
     * @param endpoint - The API endpoint to call (e.g., '/emit').
     * @param method - The HTTP method (e.g., 'POST', 'DELETE').
     * @param body - Optional request body to send as JSON.
     * @returns The parsed JSON response from the server.
     * @throws Error if the request fails after retrying.
     */
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

        try {
            const response = await fetch(url, options);
            return await this.handleResponse(response);
        } catch (error) {
            // Retry once after a 1-second delay for network errors
            await new Promise(resolve => setTimeout(resolve, 1000));
            try {
                const response = await fetch(url, options);
                return await this.handleResponse(response);
            } catch (secondError) {
                throw new Error(`API request failed after retry: ${secondError.message}`);
            }
        }
    }

    /**
     * Adds a file to the specified universe.
     * @param fileId - The unique identifier for the file.
     * @param content - The content of the file.
     * @throws Error if fileId is not a non-empty string or content is not a string.
     */
    async addFile(fileId: string, content: string): Promise<void> {
        if (typeof fileId !== 'string' || fileId.trim() === '') {
            throw new Error('fileId must be a non-empty string');
        }
        if (typeof content !== 'string') {
            throw new Error('content must be a string');
        }
        await this.fetchApi('/emit', 'POST', {
            universe: this.universe,
            thing: { id: fileId, text: content },
        });
    }

    /**
     * Updates a file in the specified universe by overwriting the existing content.
     * @param fileId - The unique identifier for the file.
     * @param content - The new content of the file.
     * @throws Error if fileId is not a non-empty string or content is not a string.
     */
    async updateFile(fileId: string, content: string): Promise<void> {
        // Universe API overwrites items with the same ID, so update is identical to add
        await this.addFile(fileId, content);
    }

    /**
     * Deletes a specific file from the universe.
     * @param fileId - The unique identifier of the file to delete.
     * @throws Error if fileId is not a non-empty string.
     */
    async deleteFile(fileId: string): Promise<void> {
        if (typeof fileId !== 'string' || fileId.trim() === '') {
            throw new Error('fileId must be a non-empty string');
        }
        await this.fetchApi(`/thing/${this.universe}/${fileId}`, 'DELETE');
    }

    /**
     * Finalizes the universe. Currently a no-op as Universe API operations are atomic.
     */
    async finalize(): Promise<void> {
        // No-op per the server's atomic operation design
    }

    /**
     * Deletes all files from the specified universe.
     */
    async deleteAllFiles(): Promise<void> {
        await this.fetchApi(`/universe/${this.universe}`, 'DELETE');
    }
}