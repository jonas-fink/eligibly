import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '../i18n.ts';
import { KontoPage } from './KontoPage.tsx';

vi.mock('../api/api-client.ts', () => ({
  ladeKonto: vi.fn(),
  ladeHaushalte: vi.fn(),
  loescheKonto: vi.fn(),
  loescheHaushalt: vi.fn(),
  meldeAb: vi.fn(),
  meldeAn: vi.fn(),
  registriere: vi.fn(),
  bestaetigeEmail: vi.fn(),
  emailErneut: vi.fn(),
  passwortVergessen: vi.fn(),
  passwortZuruecksetzen: vi.fn(),
}));

import { ladeHaushalte, ladeKonto, loescheKonto } from '../api/api-client.ts';

describe('Kontolöschung', () => {
  beforeEach(() => {
    vi.mocked(ladeKonto).mockResolvedValue({ email: 'a@b.de', emailVerifiziert: true });
    vi.mocked(ladeHaushalte).mockResolvedValue([]);
    vi.mocked(loescheKonto).mockResolvedValue();
  });

  it('löscht erst nach einer zweiten Bestätigung', async () => {
    render(
      <MemoryRouter>
        <KontoPage />
      </MemoryRouter>,
    );
    const oeffnen = await screen.findByRole('button', { name: 'Konto und alle Haushalte unwiderruflich löschen' });
    expect(oeffnen.className).toContain('btn-gefahr');
    fireEvent.click(oeffnen);
    expect(loescheKonto).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Endgültig löschen' }));
    await screen.findByRole('button', { name: 'Konto anlegen' });
    expect(loescheKonto).toHaveBeenCalledOnce();
  });
});