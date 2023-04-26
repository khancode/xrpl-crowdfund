import { UserDatabaseModel } from './user.model'
import connectDatabase from '..'
import { Connection } from 'mongoose'

describe('User model', () => {
  let database: Connection

  // Establish a database connection before running the tests
  beforeAll(async () => {
    database = await connectDatabase()
  })

  // Close the database connection after running the tests
  afterAll(async () => {
    await database.close()
  })

  it('should save a user with valid data', async () => {
    const userData = {
      username: 'testuser',
      password: 'testpassword123',
      xrplWalletSeed: 'shf1HiuejdJVPFRpP6oE6Rytj6R5U',
    }

    const user = new UserDatabaseModel(userData)
    const savedUser = await user.save()

    expect(savedUser._id).toBeDefined()
    expect(savedUser.username).toBe(userData.username)
    expect(savedUser.password).toBe(userData.password)
    expect(savedUser.xrplWalletSeed).toBe(userData.xrplWalletSeed)

    await UserDatabaseModel.deleteOne({ _id: savedUser._id })
  })

  it('should not save a user without required fields', async () => {
    const userData = {
      password: 'testpassword123',
      xrplWalletSeed: 'shf1HiuejdJVPFRpP6oE6Rytj6R5U',
    }

    const user = new UserDatabaseModel(userData)

    await expect(user.save()).rejects.toThrow()
  })

  // Add more test cases as needed
})
