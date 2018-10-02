jest.dontMock('../src/error.js');
jest.dontMock('../src/storage.js');

import { NotFoundError, ExpiredError } from '../src/error';

describe('react-native-storage: custom error types', () => {
    test('NotFoundError instance should be error instance', () => {
        const error = new NotFoundError('somekey');
        expect(error instanceof Error).toBe(true);
        expect(error.toString().includes('somekey')).toBe(true);
        expect(error.toString().includes('NotFoundError')).toBe(true);
    });

    test('ExpiredError instance should be error instance', () => {
        const error = new ExpiredError('somekey');
        expect(error instanceof Error).toBe(true);
        expect(error.toString().includes('somekey')).toBe(true);
        expect(error.toString().includes('ExpiredError')).toBe(true);
    });
});
