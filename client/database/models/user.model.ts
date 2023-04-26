import mongoose from 'mongoose'

export interface IUserDatabaseModel {
  username: string
  password: string
  xrplWalletSeed: string
}

const userSchema = new mongoose.Schema<IUserDatabaseModel>({
  username: {
    type: String,
    required: true,
    unique: true,
    maxlength: 50,
    index: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    maxlength: 100,
  },
  xrplWalletSeed: {
    type: String,
    required: true,
    unique: true,
    minlength: 29,
    maxlength: 29,
  },
})

export const UserDatabaseModel = mongoose.model('User', userSchema)
