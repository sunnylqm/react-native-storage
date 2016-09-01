/**
 * Created by sunny on 9/1/16.
 */

export class NotFoundError {
  constructor(message) {
    this.name = 'NotFoundError';
    this.message = `Not Found! Params: ${message}`;
    this.stack = new Error().stack; // Optional
  }
}
// NotFoundError.prototype = Object.create(Error.prototype);

export class ExpiredError {
  constructor(message) {
    this.name = 'ExpiredError';
    this.message = `Expired! Params: ${message}`;
    this.stack = new Error().stack; // Optional
  }
}
// ExpiredError.prototype = Object.create(Error.prototype);