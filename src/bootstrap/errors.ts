import { ErrorPolykey } from '../errors';

class ErrorBootstrap extends ErrorPolykey {}

class ErrorExistingState extends ErrorBootstrap {
  description: string = 'Files already exist at node path';
  exitCode: number = 64;
}

class ErrorMalformedKeynode extends ErrorBootstrap {
  description: string = 'Malformed Polykey state exists at node path';
  exitCode: number = 64;
}

export { ErrorExistingState, ErrorMalformedKeynode };
