"""
Changelog API Router

This router provides endpoints to access the project changelog.
The changelog contains version history and change information for the ArcanaAI project.

Endpoints:
    GET /changelog - Returns the full changelog content
    GET /changelog/latest - Returns the latest version information
    GET /changelog/version/{version} - Returns information for a specific version

Author: ArcanaAI Development Team
Version: 1.0.0
"""

import os
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

router = APIRouter(prefix="/changelog", tags=["changelog"])

# Path to the changelog file
CHANGELOG_PATH = Path(__file__).parent.parent / "docs" / "CHANGELOG.md"


@router.get("/", response_class=PlainTextResponse)
async def get_changelog():
    """
    Get the full changelog content

    Returns the complete changelog markdown file content.

    Returns:
        str: The full changelog content in markdown format

    Raises:
        HTTPException: If the changelog file cannot be read
    """
    try:
        if not CHANGELOG_PATH.exists():
            raise HTTPException(
                status_code=404,
                detail="Changelog file not found"
            )

        with open(CHANGELOG_PATH, 'r', encoding='utf-8') as file:
            content = file.read()

        return content
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error reading changelog: {str(e)}"
        )


@router.get("/latest")
async def get_latest_version():
    """
    Get the latest version information from the changelog

    Parses the changelog to extract the most recent version details.

    Returns:
        dict: Latest version information including version number, date, and changes

    Raises:
        HTTPException: If the changelog file cannot be read or parsed
    """
    try:
        if not CHANGELOG_PATH.exists():
            raise HTTPException(
                status_code=404,
                detail="Changelog file not found"
            )

        with open(CHANGELOG_PATH, 'r', encoding='utf-8') as file:
            content = file.read()

        # Parse the changelog to find the latest version
        lines = content.split('\n')
        latest_version = None
        latest_date = None
        latest_changes = {}

        current_section = None
        in_version_block = False

        for line in lines:
            line = line.strip()

            # Check for version headers
            if line.startswith('## [') and '] - ' in line:
                # If we already found a version, this is the latest one
                if latest_version is None:
                    # Extract version and date
                    version_start = line.find('[') + 1
                    version_end = line.find(']')
                    date_start = line.find(' - ') + 3

                    if version_start > 0 and version_end > version_start and date_start > 2:
                        latest_version = line[version_start:version_end]
                        latest_date = line[date_start:]
                        in_version_block = True
                        latest_changes = {}
                        current_section = None
                else:
                    # We've reached the next version, so stop parsing
                    break

            # Parse sections within the version block
            elif in_version_block and line.startswith('### '):
                current_section = line[4:].lower()  # Remove '### ' and convert to lowercase
                latest_changes[current_section] = []

            # Parse content within sections
            elif in_version_block and current_section and line.startswith('- ') and line != '- N/A':
                change_item = line[2:]  # Remove '- ' prefix
                if change_item.strip():  # Only add non-empty items
                    latest_changes[current_section].append(change_item)

        if latest_version is None:
            raise HTTPException(
                status_code=404,
                detail="No version information found in changelog"
            )

        return {
            "version": latest_version,
            "date": latest_date,
            "changes": latest_changes
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error parsing changelog: {str(e)}"
        )


@router.get("/version/{version}")
async def get_version_info(version: str):
    """
    Get information for a specific version from the changelog

    Args:
        version (str): The version number to search for (e.g., "0.0.2")

    Returns:
        dict: Version information including date and changes

    Raises:
        HTTPException: If the version is not found or the changelog cannot be read
    """
    try:
        if not CHANGELOG_PATH.exists():
            raise HTTPException(
                status_code=404,
                detail="Changelog file not found"
            )

        with open(CHANGELOG_PATH, 'r', encoding='utf-8') as file:
            content = file.read()

        # Parse the changelog to find the specific version
        lines = content.split('\n')
        target_version = None
        target_date = None
        target_changes = {}

        current_section = None
        in_target_version_block = False

        for line in lines:
            line = line.strip()

            # Check for version headers
            if line.startswith('## [') and '] - ' in line:
                # Extract version from the line
                version_start = line.find('[') + 1
                version_end = line.find(']')

                if version_start > 0 and version_end > version_start:
                    current_version = line[version_start:version_end]

                    if current_version == version:
                        # Found our target version
                        target_version = current_version
                        date_start = line.find(' - ') + 3
                        target_date = line[date_start:] if date_start > 2 else None
                        in_target_version_block = True
                        target_changes = {}
                        current_section = None
                    elif in_target_version_block:
                        # We've reached the next version, so stop parsing
                        break

            # Parse sections within the target version block
            elif in_target_version_block and line.startswith('### '):
                current_section = line[4:].lower()  # Remove '### ' and convert to lowercase
                target_changes[current_section] = []

            # Parse content within sections
            elif in_target_version_block and current_section and line.startswith('- ') and line != '- N/A':
                change_item = line[2:]  # Remove '- ' prefix
                if change_item.strip():  # Only add non-empty items
                    target_changes[current_section].append(change_item)

        if target_version is None:
            raise HTTPException(
                status_code=404,
                detail=f"Version {version} not found in changelog"
            )

        return {
            "version": target_version,
            "date": target_date,
            "changes": target_changes
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error parsing changelog: {str(e)}"
        )
