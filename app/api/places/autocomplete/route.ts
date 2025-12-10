import { NextRequest, NextResponse } from 'next/server';
import { autocompletePlace } from '@/lib/google-places';

/**
 * POST /api/places/autocomplete
 * Autocomplete place suggestions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input, types, locationBias } = body as {
      input: string;
      types?: string[];
      locationBias?: { lat: number; lng: number; radius?: number };
    };

    if (!input || input.trim().length === 0) {
      return NextResponse.json(
        { error: 'Input is required' },
        { status: 400 }
      );
    }

    // Use default types for residential places (cities, states)
    const placeTypes = types || ['locality', 'administrative_area_level_1'];

    const suggestions = await autocompletePlace(input, placeTypes, locationBias);

    return NextResponse.json({
      success: true,
      suggestions,
    });
  } catch (error: any) {
    console.error('Error autocompleting places:', error);
    const errorMessage = error?.message || 'Unknown error';
    const errorDetails = error?.stack || errorMessage;
    
    // Log full error for debugging
    console.error('Full error details:', {
      message: errorMessage,
      stack: error?.stack,
      name: error?.name,
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to autocomplete places', 
        details: errorMessage,
        // Only include stack in development
        ...(process.env.NODE_ENV === 'development' && { stack: error?.stack })
      },
      { status: 500 }
    );
  }
}

