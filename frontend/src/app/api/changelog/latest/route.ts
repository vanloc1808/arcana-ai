import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET() {
    try {
        const response = await fetch(`${BACKEND_URL}/changelog/latest`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Backend responded with status: ${response.status}`);
        }

        const latestVersion = await response.json();

        return NextResponse.json(latestVersion, {
            status: 200,
            headers: {
                'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
            },
        });
    } catch (error) {
        console.error('Error fetching latest version:', error);

        return NextResponse.json(
            { error: 'Failed to fetch latest version' },
            { status: 500 }
        );
    }
}
