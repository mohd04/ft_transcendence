import React, { useEffect, useState } from "react";
import { message } from "antd";
import type { UploadChangeParam } from "antd/es/upload";
import type { RcFile, UploadFile, UploadProps } from "antd/es/upload/interface";
import { UserProfilePicture } from "../../assets";
import ButtonComponent from "../ButtonComponent";
import {
  CustomUpload,
  ProfileImage,
  ProfilePictureContainer,
} from "./profilePicture.styled";
import { useAppDispatch, useAppSelector } from "../../hooks/reduxHooks";
import { BASE_URL, axiosPrivate } from "../../api";
import ImgCrop from "antd-img-crop";
import ProfileLoading from "./profileLoading";
import { ErrorAlert, SuccessAlert } from "../toastify";
import { setUserInfo } from "../../store/authReducer";

const getBase64 = (img: RcFile, callback: (url: string) => void) => {
  const reader = new FileReader();
  reader.addEventListener("load", () => callback(reader.result as string));
  reader.readAsDataURL(img);
};

const beforeUpload = (file: RcFile) => {
  const isJpgOrPng = file.type === "image/jpeg" || file.type === "image/png";
  if (!isJpgOrPng) {
    message.error("You can only upload JPG/PNG file!");
  }
  const isLt2M = file.size / 1024 / 1024 < 2;
  if (!isLt2M) {
    ErrorAlert("Image size must be less than 2MB!", 5000);
  }
  return isJpgOrPng && isLt2M;
};

const ProfilePicture = ({
  setShowModal,
}: {
  setShowModal: any;
}) => {
  const [uploadedFile, setUploadedFile] = useState(false);
  const { userInfo, token } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const [imageUrl, setImageUrl] = useState<any>({
    loading: false,
    image: `${BASE_URL}/users/profile-image/${userInfo?.profile_picture}/${token}`,
    file: null,
  });

  const handleChange: UploadProps["onChange"] = (
    info: UploadChangeParam<UploadFile>
  ) => {
    if (info.file.status === "uploading") {
      setImageUrl({ loading: true, image: null, file: null });
      return;
    }
    if (info.file.status === "done") {
      getBase64(info.file.originFileObj, (imageUrl) => {
        const img = new Image();
        img.src = imageUrl;
        setUploadedFile(true);
        img.addEventListener("load", function () {
          setImageUrl({ loading: false, image: imageUrl, file: info.file });
        });
      });
    }
  };

  const saveImage = async () => {
    try {
      const data = new FormData();
      data.append("image", imageUrl.file.originFileObj);
      const response = await axiosPrivate.post(
        `${BASE_URL}/users/profile-image`,
        data,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setShowModal(false);
      dispatch(setUserInfo(response.data.user));
      SuccessAlert("Profile picture changed successfully", 5000);
    } catch (error) {
    }
  };

  useEffect(() => {
    if (userInfo?.profile_picture) {
      setTimeout(() => {
        setImageUrl({
          loading: false,
          image: `${BASE_URL}/users/profile-image/${userInfo?.profile_picture}/${token}`,
          file: null,
        });
      }, 1000);
    }
  }, [userInfo, token]);
  const uploadButton = (
    <ButtonComponent
      style={{ width: "100%", maxWidth: "250px", marginBottom: "1rem" }}
    >
      Upload
    </ButtonComponent>
  );

  const onPreview = async (file) => {
    let src = file.url;
    if (!src) {
      src = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file.originFileObj);
        reader.onload = () => resolve(reader.result);
      });
    }
    const image = new Image();
    image.src = src;
    const imgWindow = window.open(src);
    imgWindow.document.write(image.outerHTML);
  };
  return (
    <ProfilePictureContainer>
      <ImgCrop>
        <CustomUpload
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          name="avatar"
          customRequest={({ file, onSuccess, onError }) => {
            Promise.resolve().then(() => onSuccess(file));
          }}
          onPreview={onPreview}
          showUploadList={false}
          beforeUpload={beforeUpload}
          onChange={handleChange}
        >
          <>
            {imageUrl.loading ? (
              <ProfileLoading />
            ) : (
              <ProfileImage
                src={imageUrl?.image}
                onError={(e) => {
                  e.currentTarget.src = UserProfilePicture;
                }}
                alt="avatar"
              />
            )}
            {uploadButton}
          </>
        </CustomUpload>
      </ImgCrop>
      <ButtonComponent
        style={{ width: "100%", maxWidth: "250px" }}
        disabled={!uploadedFile}
        onClick={saveImage}
      >
        Save
      </ButtonComponent>
    </ProfilePictureContainer>
  );
};

export default ProfilePicture;
