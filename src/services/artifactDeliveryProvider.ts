import { PublishedArtifact } from '../types/curriculum';

export interface ArtifactDeliveryProvider {
    deliver(publishedArtifact: PublishedArtifact): Promise<void>;
    get(publicationId: string): Promise<PublishedArtifact | null>;
    list(): Promise<PublishedArtifact[]>;
}

export class InMemoryDeliveryProvider implements ArtifactDeliveryProvider {
    private published: Record<string, PublishedArtifact> = {};

    async deliver(publishedArtifact: PublishedArtifact): Promise<void> {
        this.published[publishedArtifact.publication_id] = publishedArtifact;
        console.log(`Delivered publication: ${publishedArtifact.publication_id}`);
    }

    async get(publicationId: string): Promise<PublishedArtifact | null> {
        return this.published[publicationId] || null;
    }

    async list(): Promise<PublishedArtifact[]> {
        return Object.values(this.published);
    }
}

export const deliveryProvider = new InMemoryDeliveryProvider();
