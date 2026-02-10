// Test d'intégration
// C. Ecriture de notre premier test d'intégration
import { PrismaClient } from '@prisma/client';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { exec } from 'child_process';
import { PrismaWebinarRepository } from 'src/webinars/adapters/webinar-repository.prisma';
import { Webinar } from 'src/webinars/entities/webinar.entity';
import { promisify } from 'util';
const asyncExec = promisify(exec);
jest.setTimeout(60000);
describe('PrismaWebinarRepository', () => {
  let container: StartedPostgreSqlContainer;
  let prismaClient: PrismaClient;
  let repository: PrismaWebinarRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer()
      .withDatabase('test_db')
      .withUsername('user_test')
      .withPassword('password_test')
      .withExposedPorts(5432)
      .start();

    const dbUrl = container.getConnectionUri();
    prismaClient = new PrismaClient({
      datasources: { db: { url: dbUrl } },
    });

    // Run migrations to populate the database
    await asyncExec(`npx cross-env DATABASE_URL=${dbUrl} npx prisma migrate deploy`);

    return prismaClient.$connect();
  });

  beforeEach(async () => {
    repository = new PrismaWebinarRepository(prismaClient);
    await prismaClient.webinar.deleteMany();
    await prismaClient.$executeRawUnsafe('DELETE FROM "Webinar" CASCADE');
  });

  afterAll(async () => {
    await container.stop({ timeout: 1000 });
    await prismaClient.$disconnect();
  });

  describe('Scenario : repository.create', () => {
    it('should create a webinar', async () => {
      // ARRANGE
      const webinar = new Webinar({
        id: 'webinar-id',
        organizerId: 'organizer-id',
        title: 'Webinar title',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-01T01:00:00Z'),
        seats: 100,
      });

      // ACT
      await repository.create(webinar);

      // ASSERT
      const maybeWebinar = await prismaClient.webinar.findUnique({
        where: { id: 'webinar-id' },
      });
      expect(maybeWebinar).toEqual({
        id: 'webinar-id',
        organizerId: 'organizer-id',
        title: 'Webinar title',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-01T01:00:00Z'),
        seats: 100,
      });
    });
  });

  describe('Scenario : repository.findById', () => {
    it('should find a webinar by id', async () => {
      const webinar = new Webinar({
        id: 'webinar-1',
        organizerId: 'alice-id',
        title: 'Webinar Find Test',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-01T01:00:00Z'),
        seats: 100,
      });

      await repository.create(webinar);

      const found = await repository.findById('webinar-1');

      expect(found?.props.id).toBe('webinar-1');
      expect(found?.props.title).toBe('Webinar Find Test');
      expect(found?.props.seats).toBe(100);
    });
  });

  describe('Scenario : repository.update', () => {
    it('should update a webinar', async () => {
      const webinar = new Webinar({
        id: 'webinar-2',
        organizerId: 'alice-id',
        title: 'Webinar Update Test',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-01T01:00:00Z'),
        seats: 100,
      });

      await repository.create(webinar);

      webinar.update({ seats: 200 });
      await repository.update(webinar);

      const updated = await prismaClient.webinar.findUnique({
        where: { id: 'webinar-2' },
      });
      expect(updated?.seats).toBe(200);
    });
  });

  //BONUS 
  describe('Scenario : organize-webinar integration flow', () => {
    it('should test complete organize-webinar flow (integration)', async () => {
      const webinar = new Webinar({
        id: 'organized-flow-id',
        organizerId: 'flow-organizer',
        title: 'Complete Flow Webinar',
        startDate: new Date('2024-12-20T10:00:00Z'),
        endDate: new Date('2024-12-20T13:00:00Z'), 
        seats: 200,
      });
      await repository.create(webinar);
      const persisted = await prismaClient.webinar.findUnique({
        where: { id: 'organized-flow-id' },
      });
    
      expect(persisted).toBeDefined();
      expect(persisted!.seats).toBeGreaterThanOrEqual(1);
      expect(persisted!.seats).toBeLessThanOrEqual(1000);
      const durationMs = persisted!.endDate.getTime() - persisted!.startDate.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      expect(durationHours).toBeGreaterThanOrEqual(0.5); 
      expect(durationHours).toBeLessThanOrEqual(3); 
      expect(persisted!.endDate > persisted!.startDate).toBe(true);
      const retrieved = await repository.findById('organized-flow-id');
      expect(retrieved?.props.title).toBe('Complete Flow Webinar');
  
  });
});
});
