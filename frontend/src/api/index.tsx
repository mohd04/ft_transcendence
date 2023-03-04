import axios from "axios";
import jwt_decode, { JwtPayload } from "jwt-decode";
import dayjs from "dayjs";
import localStorage from "redux-persist/es/storage";
import { router } from "../router";
import { logOut, setUserInfo } from "../store/authReducer";
import { store } from "../store";

const BASE_URL = "http://localhost:3080/api";

export default axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

export const axiosPrivate = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

axiosPrivate.interceptors.request.use(async (req) => {
  const data = await localStorage.getItem("auth");
  if (data === null) {
    try {
      const response = await axios.get(`${BASE_URL}/auth/token/`, {
        withCredentials: true,
      });
      localStorage.setItem("auth", JSON.stringify(response.data));
      store.dispatch(setUserInfo(response.data.user));
      req.headers.Authorization = `Bearer ${response.data.token}`;
      return req;
    } catch (err) {
      try {
        await axios.get(`${BASE_URL}/auth/logout`, {
          withCredentials: true,
        });
      } catch (err) {}
      store.dispatch(logOut());
      router.navigate("/login");
      return req;
    }
  }
  const token = JSON.parse(data).token;
  const user = jwt_decode<JwtPayload>(token);
  const isExpired = dayjs.unix(user.exp!).diff(dayjs()) - 5000 < 1;
  if (!isExpired) {
    req.headers.Authorization = `Bearer ${token}`;
    return req;
  }
  try {
    const response = await axios.get(`${BASE_URL}/auth/token/`, {
      withCredentials: true,
    });
    localStorage.setItem("auth", JSON.stringify(response.data));
    store.dispatch(setUserInfo(response.data.user));
    req.headers.Authorization = `Bearer ${response.data.token}`;
    return req;
  } catch (err) {
    try {
      await axios.get(`${BASE_URL}/auth/logout`, {
        withCredentials: true,
      });
    } catch (err) {}
    localStorage.removeItem("auth");
    store.dispatch(logOut());
    router.navigate("/login");
    return req;
  }
});