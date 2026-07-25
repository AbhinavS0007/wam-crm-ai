import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import App from '../App.jsx';
import * as endpoints from '../api/endpoints.js';
import { ApiError } from '../api/client.js';

vi.mock('../api/endpoints.js');

afterEach(() => {
  vi.clearAllMocks();
});

describe('App', () => {
  it('renders the sign-in screen when no session can be restored', async () => {
    endpoints.refresh.mockRejectedValue(new ApiError({ status: 401, code: 'NO_SESSION' }));

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });
});
