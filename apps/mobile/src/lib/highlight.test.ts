import { highlight } from './highlight';

test('marks every occurrence and keeps the rest', () => {
  expect(highlight('Fee GHS 0.00 Tax GHS 0.00.', ['GHS 0.00'])).toEqual([
    { text: 'Fee ', match: false },
    { text: 'GHS 0.00', match: true },
    { text: ' Tax ', match: false },
    { text: 'GHS 0.00', match: true },
    { text: '.', match: false },
  ]);
});

test('overlaps go to the longer match', () => {
  expect(highlight('to AMA OWUSU 0551', ['AMA', 'AMA OWUSU 0551']).filter((s) => s.match)).toEqual([{ text: 'AMA OWUSU 0551', match: true }]);
});

test('ignores empty needles', () => {
  expect(highlight('abc', [undefined, ''])).toEqual([{ text: 'abc', match: false }]);
});
