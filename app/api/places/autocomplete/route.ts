import { NextRequest, NextResponse } from 'next/server';
import { autocompletePlace } from '@/lib/google-places';

/**
 * POST /api/places/autocomplete
 * Autocomplete place suggestions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0b647a20-39da-41f8-8e58-123e4b9083c7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/places/autocomplete/route.ts:10',message:'API route received request',data:{hasInput:!!body.input,hasIncludedPrimaryTypes:!!body.includedPrimaryTypes,hasLocationBias:!!body.locationBias,locationBias:body.locationBias,hasLocationRestriction:!!body.locationRestriction,locationRestriction:body.locationRestriction},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
    // #endregion
    const { input, types, includedPrimaryTypes, locationBias, locationRestriction } = body as {
      input: string;
      types?: string[]; // Legacy support
      includedPrimaryTypes?: string[];
      locationBias?: { lat: number; lng: number; radius?: number };
      locationRestriction?: { lat: number; lng: number; radius?: number };
    };

    if (!input || input.trim().length === 0) {
      return NextResponse.json(
        { error: 'Input is required' },
        { status: 400 }
      );
    }

    // Use includedPrimaryTypes if provided, otherwise fall back to types (legacy)
    // If neither is provided, use empty array to search without type filtering (not default to locality)
    // This allows fallback searches to work without type restrictions
    const primaryTypes = includedPrimaryTypes !== undefined 
      ? includedPrimaryTypes 
      : (types !== undefined ? types : []);
    
    // Use locationRestriction if provided, otherwise fall back to locationBias
    const locationParam = locationRestriction || locationBias;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0b647a20-39da-41f8-8e58-123e4b9083c7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/places/autocomplete/route.ts:29',message:'Calling autocompletePlace',data:{hasIncludedPrimaryTypes:includedPrimaryTypes!==undefined,hasTypes:types!==undefined,primaryTypes,primaryTypesLength:primaryTypes.length,hasLocationParam:!!locationParam,locationParam},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'A,B,C'})}).catch(()=>{});
    // #endregion

    const suggestions = await autocompletePlace(input, primaryTypes, locationParam);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0b647a20-39da-41f8-8e58-123e4b9083c7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/places/autocomplete/route.ts:42',message:'Returning suggestions',data:{suggestionsCount:suggestions.length,allSuggestions:suggestions.map((s:any)=>({description:s.description,placeId:s.placeId}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'A,B,C'})}).catch(()=>{});
    // #endregion

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

