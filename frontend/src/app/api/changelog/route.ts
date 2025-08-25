import { NextResponse } from 'next/server';

import { API_URL } from '@/config';

const BACKEND_URL = API_URL;

export async function GET() {
    try {
        const response = await fetch(`${BACKEND_URL}/changelog/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'text/plain',
            },
        });

        if (!response.ok) {
            throw new Error(`Backend responded with status: ${response.status}`);
        }

        const changelogContent = await response.text();

        return new NextResponse(changelogContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain',
                'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
            },
        });
    } catch (error) {
        console.error('Error fetching changelog:', error);

        return NextResponse.json(
            { error: 'Failed to fetch changelog' },
            { status: 500 }
        );
    }
}
