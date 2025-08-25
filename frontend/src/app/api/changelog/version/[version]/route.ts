import { NextRequest, NextResponse } from 'next/server';

import { API_URL } from '@/config';

const BACKEND_URL = API_URL;

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ version: string }> }
) {
    try {
        const { version } = await params;

        if (!version) {
            return NextResponse.json(
                { error: 'Version parameter is required' },
                { status: 400 }
            );
        }

        const response = await fetch(`${BACKEND_URL}/changelog/version/${version}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            if (response.status === 404) {
                return NextResponse.json(
                    { error: `Version ${version} not found` },
                    { status: 404 }
                );
            }
            throw new Error(`Backend responded with status: ${response.status}`);
        }

        const versionInfo = await response.json();

        return NextResponse.json(versionInfo, {
            status: 200,
            headers: {
                'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
            },
        });
    } catch (error) {
        console.error('Error fetching version info:', error);

        return NextResponse.json(
            { error: 'Failed to fetch version information' },
            { status: 500 }
        );
    }
}
