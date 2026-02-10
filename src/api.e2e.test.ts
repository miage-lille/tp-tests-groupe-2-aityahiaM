import supertest from 'supertest';
import { TestServerFixture } from './tests/fixtures';
jest.setTimeout(120000);
describe('Webinar Routes E2E', () => {
  let fixture: TestServerFixture;

  beforeAll(async () => {
    fixture = new TestServerFixture();
    await fixture.init();
  });

  beforeEach(async () => {
    await fixture.reset();
  });

  afterAll(async () => {
    await fixture.stop();
  });

  it('should update webinar seats', async () => {
    // ARRANGE
    const prisma = fixture.getPrismaClient();
    const server = fixture.getServer();

    const webinar = await prisma.webinar.create({
      data: {
        id: 'test-webinar',
        title: 'Webinar Test',
        seats: 10,
        startDate: new Date(),
        endDate: new Date(),
        organizerId: 'test-user',
      },
    });

    // ACT
    const response = await supertest(server)
      .post(`/webinars/${webinar.id}/seats`)
      .send({ seats: '30' })
      .expect(200);

    // ASSERT
    expect(response.body).toEqual({ message: 'Seats updated' });

    const updatedWebinar = await prisma.webinar.findUnique({
      where: { id: webinar.id },
    });
    expect(updatedWebinar?.seats).toBe(30);
  });

  it('should return 404 error when webinar does not exist', async () => {
    // ARRANGE
    const server = fixture.getServer();
    
    // ACT
    const response = await supertest(server)
      .post('/webinars/non-existing-webinar/seats')
      .send({ seats: '50' })
      .expect(404); 

    // ASSERT
    expect(response.body).toEqual({
      error: 'Webinar not found'
    });
  });

  it('should return 401 error when user is not the organizer', async () => {
    // ARRANGE
    const prisma = fixture.getPrismaClient();
    const server = fixture.getServer();

    await prisma.webinar.create({
      data: {
        id: 'specific-organizer-webinar',
        title: 'Webinar with specific organizer',
        seats: 20,
        startDate: new Date(),
        endDate: new Date(),
        organizerId: 'main-organizer',
      },
    });

    // ACT
    const response = await supertest(server)
      .post('/webinars/specific-organizer-webinar/seats')
      .send({ seats: '40' })
      .expect(401); 

    // ASSERT
    expect(response.body).toEqual({
      error: 'User is not allowed to update this webinar'
    });
  });
});
