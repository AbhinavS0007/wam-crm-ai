export class EncryptionConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EncryptionConfigurationError';
  }
}

export class EncryptionOperationError extends Error {
  constructor(message = 'Unable to process encrypted field.') {
    super(message);
    this.name = 'EncryptionOperationError';
  }
}
