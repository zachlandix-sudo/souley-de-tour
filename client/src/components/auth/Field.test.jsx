import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Field from './Field';
import PhotoHolder from '../PhotoHolder';

describe('Field', () => {
  it('toggles password visibility', async () => {
    render(<Field label="Password" type="password" defaultValue="secret12" />);
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');
    await userEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(input).toHaveAttribute('type', 'password');
  });
  it('links the error to the input', () => {
    render(<Field label="Email" error="Enter your email." />);
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Enter your email.');
  });
});

describe('PhotoHolder', () => {
  it('is an image role with the spot name', () => {
    render(<PhotoHolder alt="Maasin Cathedral" path="/spots/maasin-cathedral.jpg" />);
    expect(screen.getByRole('img', { name: 'Maasin Cathedral' })).toBeInTheDocument();
  });
});
