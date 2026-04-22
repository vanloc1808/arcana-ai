import { NextResponse } from 'next/server';

import { API_URL } from '@/config';

const BACKEND_URL = API_URL;

export async function GET() {
    try {
        const response = await fetch(`${BACKEND_URL}/changelog/all`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Backend responded with status: ${response.status}`);
        }

        const allVersions = await response.json();

        return NextResponse.json(allVersions, {
            status: 200,
            headers: {
                'Cache-Control': 'public, max-age=300',
            },
        });
    } catch (error) {
        console.error('Error fetching all versions:', error);

        return NextResponse.json(
            { error: 'Failed to fetch all versions' },
            { status: 500 }
        );
    }
}
