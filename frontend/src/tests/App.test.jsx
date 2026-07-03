import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../App.jsx';

describe('App', () => {
  it('renders the WAM CRM AI placeholder', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', {
        name: 'WAM CRM AI',
      }),
    ).toBeInTheDocument();

    expect(screen.getByText('Frontend is running')).toBeInTheDocument();
  });
});