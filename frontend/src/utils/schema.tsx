import * as yup from "yup";

export const PlaySchema = yup
  .object({
    hasMiddleWall: yup.boolean().required("Map field is required"),
  })
  .required();

export const NickNameSchema = yup
  .object({
    nickName: yup.string().required("Nick name field is required"),
  })
  .required();

export const TwoFactorSchema = yup
  .object({
    otp: yup.string().required("The pin field is required"),
  })
  .required();
