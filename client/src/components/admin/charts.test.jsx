import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LineChart from './LineChart';
import DonutChart from './DonutChart';
import StatBars from './StatBars';

const labels = ['Nov 10', 'Nov 11', 'Nov 12'];
const series = [
  { id: 'a', label: 'New sign-ups', color: '#ff6a13', values: [0, 4, 2] },
  { id: 'b', label: 'New reviews', color: '#2b2b2b', values: [1, 0, 3] },
];

describe('LineChart', () => {
  it('draws one line per series and gives screen readers every value in a table', () => {
    const { container } = render(<LineChart labels={labels} series={series} label="Activity per day" />);
    expect(container.querySelectorAll('.adm-lc-line')).toHaveLength(2);
    const table = screen.getByRole('table', { name: 'Activity per day' });
    const row = within(table).getByRole('row', { name: /Nov 11/ });
    expect(within(row).getAllByRole('cell').map((c) => c.textContent)).toEqual(['4', '0']);
  });

  it('only a single line gets the soft fill underneath', () => {
    const one = render(<LineChart labels={labels} series={[series[0]]} />);
    expect(one.container.querySelectorAll('.adm-lc-area')).toHaveLength(1);
    one.unmount();
    const two = render(<LineChart labels={labels} series={series} />);
    expect(two.container.querySelectorAll('.adm-lc-area')).toHaveLength(0);
  });

  it('the arrow keys move a guide that shows every value at that point, Escape hides it', async () => {
    const { container } = render(<LineChart labels={labels} series={series} label="Activity per day" />);
    expect(container.querySelector('.adm-lc-tip')).toBeNull();
    await userEvent.tab(); // the chart is the only tab stop: it starts on the latest point
    const tip = () => container.querySelector('.adm-lc-tip');
    expect(tip()).toHaveTextContent('Nov 12');
    expect(tip()).toHaveTextContent('New sign-ups2');
    expect(tip()).toHaveTextContent('New reviews3');
    await userEvent.keyboard('{ArrowLeft}');
    expect(tip()).toHaveTextContent('Nov 11');
    expect(tip()).toHaveTextContent('New sign-ups4');
    await userEvent.keyboard('{Home}');
    expect(tip()).toHaveTextContent('Nov 10');
    expect(container.querySelectorAll('.adm-lc-dot')).toHaveLength(2);
    await userEvent.keyboard('{Escape}');
    expect(tip()).toBeNull();
  });

  it('says so when nothing happened in the period', () => {
    render(<LineChart labels={labels} series={[{ ...series[0], values: [0, 0, 0] }]} emptyText="Quiet." />);
    expect(screen.getByText('Quiet.')).toBeInTheDocument();
  });

  it('does not break with no data at all', () => {
    const { container } = render(<LineChart />);
    expect(container.querySelector('.adm-lc')).not.toBeNull();
  });
});

describe('DonutChart', () => {
  const items = [{ key: 'published', label: 'Published', value: 3 }, { key: 'draft', label: 'Draft', value: 1 }, { key: 'archived', label: 'Archived', value: 0 }];

  it('shows the total in the middle, a slice for each non-zero item and every item in the legend with its share', () => {
    const { container } = render(<DonutChart items={items} noun="spots" label="Spots by status" />);
    expect(container.querySelectorAll('.adm-donut-slice')).toHaveLength(2);
    expect(container.querySelector('.adm-donut-num')).toHaveTextContent('4');
    expect(container.querySelector('.adm-donut-cap')).toHaveTextContent('spots');
    expect(screen.getByRole('button', { name: /Published.*3.*75%/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Draft.*1.*25%/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Archived.*0.*0%/ })).toBeInTheDocument();
  });

  it('focusing a legend row picks out its slice and shows its own number; leaving puts the total back', async () => {
    const { container } = render(<DonutChart items={items} noun="spots" />);
    await userEvent.tab();
    expect(screen.getByRole('button', { name: /Published/ })).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelector('.adm-donut')).toHaveClass('has-active');
    expect(container.querySelector('.adm-donut-num')).toHaveTextContent('3');
    expect(container.querySelector('.adm-donut-cap')).toHaveTextContent('Published');
    expect(container.querySelectorAll('.adm-donut-slice.is-on')).toHaveLength(1);
    await userEvent.tab(); // on to the Draft row
    expect(container.querySelector('.adm-donut-num')).toHaveTextContent('1');
    fireEvent.blur(document.activeElement); // focus leaves the legend
    expect(container.querySelector('.adm-donut')).not.toHaveClass('has-active');
    expect(container.querySelector('.adm-donut-num')).toHaveTextContent('4');
  });

  it('the "Other" slice keeps its own neutral colour', () => {
    const { container } = render(<DonutChart items={[{ key: 'a', label: 'A', value: 2 }, { key: '__other', label: 'Other', value: 1 }]} />);
    const other = [...container.querySelectorAll('.adm-donut-slice')].pop();
    expect(other.getAttribute('style')).toContain('#cfc8ba');
  });

  it('an empty list renders without slices', () => {
    const { container } = render(<DonutChart items={[]} />);
    expect(container.querySelectorAll('.adm-donut-slice')).toHaveLength(0);
    expect(container.querySelector('.adm-donut-num')).toHaveTextContent('0');
  });
});

describe('StatBars', () => {
  const items = [{ key: 'a', label: 'Maasin City', value: 12 }, { key: 'b', label: 'Sogod', value: 6 }, { key: 'c', label: 'Hinunangan', value: 0 }];

  it('rows: label, value, the biggest bar marked best, a zero bar marked empty', () => {
    const { container } = render(<StatBars items={items} unit="spots" label="Spots per town" />);
    const list = screen.getByRole('list', { name: 'Spots per town' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('Maasin City')).toBeInTheDocument();
    expect(container.querySelector('li.is-best')).toHaveTextContent('Maasin City');
    expect(container.querySelector('li.is-zero')).toHaveTextContent('Hinunangan');
    expect(container.querySelector('li.is-best').style.getPropertyValue('--w')).toBe('1');
    expect(container.querySelector('li:nth-child(2)').style.getPropertyValue('--w')).toBe('0.5');
  });

  it('columns when vertical, with the unit read out for screen readers', () => {
    const { container } = render(<StatBars items={[{ key: '5', label: '5★', value: 7 }]} unit="reviews" vertical />);
    expect(container.querySelector('ul.adm-vb')).not.toBeNull();
    expect(screen.getByText(/: 7 reviews/)).toBeInTheDocument();
  });

  it('all zeros: no bar is marked best', () => {
    const { container } = render(<StatBars items={[{ key: 'a', label: 'A', value: 0 }]} />);
    expect(container.querySelector('li.is-best')).toBeNull();
  });
});
