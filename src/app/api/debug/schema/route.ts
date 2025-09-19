import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

export async function GET() {
  try {
    const userFields = Prisma.dmmf.datamodel.models.find(model => model.name === 'User')?.fields;
    const fieldNames = userFields?.map(field => ({ name: field.name, type: field.type, kind: field.kind })) || [];
    
    return NextResponse.json({
      message: "Successfully introspected Prisma schema",
      userModelFields: fieldNames
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        message: 'Failed to introspect Prisma schema',
        error: error.message,
        stack: error.stack
      },
      { status: 500 }
    );
  }
}
