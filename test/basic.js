import { expect } from 'chai';
import { describe, it } from 'mocha';
import chunq from '../src/index';

describe('Basic', () => {
  it('should work', async () => {
    const actual = await
      chunq.from(
          [
            {
              firstName: 'Rushi',
              lastName: 'Desai',
              age: 37
            },
            {
              firstName: 'Pracheeti',
              lastName: 'Desai',
              age: 37
            },
            {
              firstName: 'Laykha',
              lastName: 'Desai',
              age: 4,
            },
          ], [
            {
              firstName: 'Kavya',
              lastName: 'Desai',
              age: 2,
            }
          ]
        )
        .concat(chunq.from([
            {
              firstName: 'Parag',
              lastName: 'Desai',
              age: 44,
            },
            {
              firstName: 'Ketaki',
              lastName: 'Apte',
              age: 40,
            },
            {
              firstName: 'Sanjana',
              lastName: 'Desai',
              age: 16,
            }
          ]
        ))
        .filter(person => person.lastName === 'Desai')
        .orderBy([person => person.age, true], person => person.firstName)
        .map(person => person.firstName)
        .collectChunks();
    expect(actual).to.deep.equal([
      ['Parag', 'Pracheeti', 'Rushi', 'Sanjana', 'Laykha', 'Kavya'],
    ]);
  });
});
