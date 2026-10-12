import React, { useState, useEffect } from 'react';
import { deliveryEngine } from '../services/aiEducationalArtifactDeliveryEngine';
import { PublishedArtifact } from '../types/curriculum';

export const EducationalArtifactDelivery: React.FC = () => {
    const [artifacts, setArtifacts] = useState<PublishedArtifact[]>([]);
    const [selected, setSelected] = useState<PublishedArtifact | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        deliveryEngine.listPublishedArtifacts().then(setArtifacts).catch(e => setError(e.message));
    }, []);

    const handleSelect = async (id: string) => {
        try {
            const art = await deliveryEngine.getPublishedArtifact(id);
            setSelected(art);
            setError(null);
        } catch (e: any) {
            setError(e.message);
        }
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Published Educational Content</h1>
            {error && <p className="text-red-500 mb-4">Error: {error}</p>}
            <div className="grid grid-cols-2 gap-4">
                <div className="border p-2">
                    <h2 className="font-semibold">Content List</h2>
                    <ul>
                        {artifacts.map(a => (
                            <li key={a.publication_id} className="cursor-pointer text-blue-600 hover:underline" onClick={() => handleSelect(a.publication_id)}>
                                {a.educational_content.title}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="border p-2">
                    <h2 className="font-semibold">Content Detail</h2>
                    {selected ? (
                        <div>
                            <p><strong>Title:</strong> {selected.educational_content.title}</p>
                            <p><strong>Status:</strong> {selected.publication_status}</p>
                            <p><strong>Published At:</strong> {selected.published_at}</p>
                        </div>
                    ) : <p>Select an item.</p>}
                </div>
            </div>
        </div>
    );
};
