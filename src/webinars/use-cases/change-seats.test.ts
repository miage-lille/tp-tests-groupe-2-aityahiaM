// Tests unitaires

import { testUser } from 'src/users/tests/user-seeds';
import { InMemoryWebinarRepository } from 'src/webinars/adapters/webinar-repository.in-memory';
import { ChangeSeats } from './change-seats';
import { Webinar } from '../entities/webinar.entity';
import { WebinarNotFoundException } from 'src/webinars/exceptions/webinar-not-found';
import { WebinarNotOrganizerException } from 'src/webinars/exceptions/webinar-not-organizer';
import { WebinarReduceSeatsException } from '../exceptions/webinar-reduce-seats';
import { WebinarTooManySeatsException } from '../exceptions/webinar-too-many-seats';
describe('Feature : Change seats', () => {
  // Initialisation de nos tests, boilerplates...
  let webinarRepository: InMemoryWebinarRepository;
  let useCase: ChangeSeats;

  const webinar = new Webinar({
    id: 'webinar-id',
    organizerId: testUser.alice.props.id,
    title: 'Webinar title',
    startDate: new Date('2024-01-01T00:00:00Z'),
    endDate: new Date('2024-01-01T01:00:00Z'),
    seats: 100,
  });

  beforeEach(() => {
    webinarRepository = new InMemoryWebinarRepository([webinar]);
    useCase = new ChangeSeats(webinarRepository);
  });

  describe('Scenario: Happy path', () => {
    // Code commun à notre scénario : payload...
    const payload = {
      user: testUser.alice,
      webinarId: 'webinar-id',
      seats: 200,
    };
    it('should change the number of seats for a webinar', async () => {
      // Vérification de la règle métier, condition testée...
      await useCase.execute(payload);
      // ASSERT
      const updatedWebinar = await webinarRepository.findById('webinar-id');
      expect(updatedWebinar?.props.seats).toEqual(200);
    });
  });

  describe('Scenario: webinar does not exist', () => {
    const payload = {
      user: testUser.alice,
      webinarId: 'unknown-webinar-id',
      seats: 200,
    };

    it('should fail if webinar does not exist', async () => {
      // ACT + ASSERT
      await expect(useCase.execute(payload)).rejects.toThrow(
        WebinarNotFoundException,
      );

      // ASSERT : le webinaire initial n’a pas été modifié
      const webinar = webinarRepository.findByIdSync('webinar-id');
      expect(webinar?.props.seats).toEqual(100);
    });

    describe('Scenario: update the webinar of someone else', () => {
      const payload = {
        user: testUser.bob,
        webinarId: 'webinar-id',
        seats: 200,
      };

      it('should fail if user is not the organizer', async () => {
        // ACT + ASSERT
        await expect(useCase.execute(payload)).rejects.toThrow(
          WebinarNotOrganizerException,
        );

        // ASSERT : le webinaire n’a pas été modifié
        const webinar = webinarRepository.findByIdSync('webinar-id');
        expect(webinar?.props.seats).toEqual(100);
      });
    });

    describe('Scenario: change seat to an inferior number', () => {
      const payload = {
        user: testUser.alice,
        webinarId: 'webinar-id',
        seats: 50, // inférieur à 100
      };

      it('should fail if seats number is inferior to current seats', async () => {
        // ACT + ASSERT
        await expect(useCase.execute(payload)).rejects.toThrow(
          WebinarReduceSeatsException,
        );

        // ASSERT : le webinaire n’a pas été modifié
        const webinar = webinarRepository.findByIdSync('webinar-id');
        expect(webinar?.props.seats).toEqual(100);
      });
    });

    describe('Scenario: change seat to a number > 1000', () => {
      const payload = {
        user: testUser.alice,
        webinarId: 'webinar-id',
        seats: 1500, //supérieur à 1000
      };

      it('should fail if seats number is greater than 1000', async () => {
        // ACT + ASSERT
        await expect(useCase.execute(payload)).rejects.toThrow(
          WebinarTooManySeatsException,
        );

        // ASSERT : le webinaire n’a pas été modifié
        const webinar = webinarRepository.findByIdSync('webinar-id');
        expect(webinar?.props.seats).toEqual(100);
      });
    });
  });
});
