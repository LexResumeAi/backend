// Declaration file for modules without type definitions

// In case uuid types don't work properly
declare module 'uuid' {
    export function v4(): string;
  }
  
  // For any Handlebars extensions that might not be covered
  declare namespace Handlebars {
    interface HelperOptions {
      fn(context: any): string;
      inverse(context: any): string;
      hash: any;
      data: any;
    }
  }