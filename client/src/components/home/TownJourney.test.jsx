import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '../../i18n/I18nContext';
import TownJourney, { RouteSketch } from './TownJourney';
import { JOURNEY } from '../../utils/townRoute';

const TOWNS = [
  ['Maasin City', 'maasin', 'Maasin Cathedral'], ['Padre Burgos', 'burgos', 'Tangka-an Point'], ['Limasawa', 'limasawa', 'First Cross Monument'],
  ['Silago', 'silago', 'Kagut-an Falls'], ['Macrohon', 'macrohon', 'Seven Falls'], ['Pintuyan', 'pintuyan', 'Dan-an Falls'],
  ['Sogod', 'sogod', 'Sogod Bay'], ['Hinunangan', 'hinunangan', 'San Pedro Island'],
];
const Arrow = () => <svg />;
const spotsIn = (town) => `/spots?municipality=${encodeURIComponent(town)}`;
const wrap = (ui) => render(<I18nProvider><MemoryRouter>{ui}</MemoryRouter></I18nProvider>);

describe('TownJourney', () => {
  it('starts on the first town of the tour, with its link to the filtered spots list', () => {
    wrap(<TownJourney towns={TOWNS} spotsIn={spotsIn} Arrow={Arrow} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Explore by town' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Maasin City');
    expect(screen.getByRole('link', { name: /See spots/ })).toHaveAttribute('href', '/spots?municipality=Maasin%20City');
  });
  it('has a button for every town on the tour so keyboard users can jump between them', () => {
    wrap(<TownJourney towns={TOWNS} spotsIn={spotsIn} Arrow={Arrow} />);
    expect(JOURNEY).toHaveLength(8);
    for (const [name] of TOWNS) expect(screen.getByRole('button', { name })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Maasin City' })).toHaveAttribute('aria-current', 'step');
  });
});

describe('RouteSketch', () => {
  it('draws the route fully when it cannot animate (no IntersectionObserver)', () => {
    const { container } = wrap(<RouteSketch towns={TOWNS} />);
    expect(container.querySelector('.route-sketch.is-in')).not.toBeNull();
    expect(container.querySelectorAll('.seg')).toHaveLength(7);
  });
});
