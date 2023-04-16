import {
  GroupArrow,
  GroupAvatar,
  GroupInfo,
  GroupItem,
  GroupName,
  GroupTitle,
} from "./group.styled";
import { List, Avatar, Dropdown, Menu, MenuProps, Button } from "antd";
import { DownOutlined } from "@ant-design/icons";
import { UserProfilePicture } from "../../../assets";
import { FaUserPlus, FaUserFriends, FaUserSlash } from "react-icons/fa";
import { Colors, GNav, Role } from "../../chat.functions";
import { useState } from "react";
import axios from "axios";
import { logOut } from "../../../store/authReducer";
import { useAppDispatch } from "../../../hooks/reduxHooks";

interface GroupChatRelationsProps {
  socket: any;
  conversationID: string;
  conversation: any;
}

const GroupChatRelations = ({
  socket,
  conversationID,
  conversation,
}: GroupChatRelationsProps) => {
  const [user, setUser] = useState<any>(null);
  /*-----------Handle User Click-------------------------------------------------*/
  const handleUserClick = (participants: any) => {
    setUser(participants.user);
  };
  /*-----------Handle User Click-------------------------------------------------*/
  /*-----------Handle Menu Click-------------------------------------------------*/
  const handleMenuClick = (e: any) => {
    if (e.target.textContent === "Make Admin") {
      socket?.emit("makeAdmin");
      console.log("Make Admin");
    } else if (e.target.textContent === "Ban") {
      console.log("User Ban", user);
      socket?.emit("banUser", {
        conversationID: conversation.id,
        userID: user.id,
      });
      console.log("Ban");
    } else if (e.target.textContent === "Mute") {
      socket?.emit("mute", conversation);
      console.log("Mute");
    } else if (e.target.textContent === "Kick") {
      socket?.emit("kick", conversation);
      console.log("Kick");
    }
  };
  /*-----------Handle Menu Click-------------------------------------------------*/
  /*-----------Handle Unban Click-------------------------------------------------*/
  const handleUnbanClick = () => {
    console.log("unban");
  };
  /*-----------Handle Unban Click-------------------------------------------------*/
  /*-----------MENU-------------------------------------------------*/
  const items: MenuProps["items"] = [
    {
      key: "1",
      label: <div onClick={(e) => handleMenuClick(e)}>Make Admin</div>,
      disabled:
        conversation && conversation.participants[0].role !== Role.OWNER
          ? true
          : false,
    },
    {
      key: "2",
      label: <div onClick={(e) => handleMenuClick(e)}>Ban</div>,
    },
    {
      key: "3",
      label: <div onClick={(e) => handleMenuClick(e)}>Mute</div>,
    },
    {
      key: "4",
      label: <div onClick={(e) => handleMenuClick(e)}>Kick</div>,
    },
  ];
  /*----------------------------------------------------------------*/
  /*----------------------------------------------------------------*/
  const dispatch = useAppDispatch();
  const [GroupNav, setGroupNav] = useState(GNav.GROUPS);
  const [results, setResults] = useState([]);
  const HandleGroupNavClick = (nav: any) => async () => {
    const getToken = async () => {
      try {
        const response = await axios.get("http://localhost:3001/token", {
          withCredentials: true,
        });
        localStorage.setItem("auth", JSON.stringify(response.data));
        return response.data.token;
      } catch (err) {
        dispatch(logOut());
        window.location.reload();
        return null;
      }
    };
    if (nav === GNav.GROUPS && conversationID !== null) {
      const token = await getToken();
      console.log("conversationID", conversationID);
      try {
        const result = await axios.get(
          `http://localhost:3001/chat/${conversationID}/members`,
          {
            withCredentials: true,
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setResults(result.data);
        console.log("Group members", result.data);
      } catch (err) {
        console.log(err);
      }
    }
    if (nav === GNav.BLOCKED && conversationID !== null) {
      const token = await getToken();
      console.log(conversationID);
      try {
        const result = await axios.get(
          `http://localhost:3001/chat/channel/${conversationID}/banned`,
          {
            withCredentials: true,
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setResults(result.data);
        console.log("Banned Members", result);
      } catch (err) {
        console.log(err);
      }
    }
    if (nav === GNav.ADD && conversationID !== null) {
      const token = await getToken();
      console.log(conversationID);
      try {
        const result = await axios.get(
          `http://localhost:3001/chat/${conversationID}/members`,
          {
            withCredentials: true,
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setResults(result.data);
        console.log("Add Members", result.data);
      } catch (err) {
        console.log(err);
      }
    }
    setGroupNav(nav);
  };

  return (
    <>
      <GroupTitle>
        <FaUserFriends
          onClick={HandleGroupNavClick(GNav.GROUPS)}
          color={GroupNav === GNav.GROUPS ? Colors.WHITE : Colors.PRIMARY}
          size={30}
        />
        <FaUserSlash
          onClick={HandleGroupNavClick(GNav.BLOCKED)}
          color={GroupNav === GNav.BLOCKED ? Colors.WHITE : Colors.PRIMARY}
          size={30}
        />
        <FaUserPlus
          onClick={HandleGroupNavClick(GNav.ADD)}
          color={GroupNav === GNav.ADD ? Colors.WHITE : Colors.PRIMARY}
          size={30}
        />
      </GroupTitle>
      {GroupNav === GNav.GROUPS ? (
        <List
          itemLayout="horizontal"
          dataSource={results}
          renderItem={(result) => (
            <GroupItem key={result.id} onClick={() => handleUserClick(result)}>
              <GroupInfo>
                <GroupAvatar src={UserProfilePicture} />
                <GroupName>{result.user.username}</GroupName>
                {conversation.participants[0].role !== Role.USER ? (
                  result.role === "USER" ? (
                    <Dropdown menu={{ items }} trigger={["click"]}>
                      <GroupArrow>
                        <DownOutlined className="group-arrow" />
                      </GroupArrow>
                    </Dropdown>
                  ) : null
                ) : null}
              </GroupInfo>
            </GroupItem>
          )}
        />
      ) : GroupNav === GNav.BLOCKED ? (
        <List
          itemLayout="horizontal"
          dataSource={results}
          renderItem={(result) => (
            <GroupItem>
              <GroupInfo>
                <GroupAvatar src={UserProfilePicture} />
                <GroupName>{result.user.username}</GroupName>
                {conversation.participants[0].role !== Role.USER ? (
                  result.role === "USER" ? (
                    <Button type="primary" onClick={handleUnbanClick}>
                      Unban
                    </Button>
                  ) : null
                ) : null}
              </GroupInfo>
            </GroupItem>
          )}
        />
      ) : (
        <h1>Ban</h1>
      )}
    </>
  );
};

export default GroupChatRelations;
