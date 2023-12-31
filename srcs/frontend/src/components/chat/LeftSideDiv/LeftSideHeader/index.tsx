import {
	ParentMessageNav,
	StyledBiCommentAdd,
	StyledHiOutlineUser,
	StyledHiOutlineUserGroup,
	StyledMdOutlineTravelExplore,
} from "./LeftSideHeader.styled";
import { Nav, Colors } from "../../chat.functions";
import { useCallback, useEffect } from "react";
import { useAppSelector } from "../../../../hooks/reduxHooks";
import { axiosPrivate } from "../../../../api";
interface LeftSideHeaderProps {
	user: any;
	socket: any;
	Navbar: Nav;
	setNavbar: (nav: Nav) => void;
	setConversations: (conversations: any) => void;
	setConversation: (conversation: any) => void;
	setResults: (results: any) => void;
	setConversationID: (conversationID: any) => void;
	setMessages: (messages: any) => void;
}

function LeftSideHeader({
	user,
	socket,
	Navbar,
	setNavbar,
	setConversations,
	setConversation,
	setResults,
	setConversationID,
	setMessages,
}: LeftSideHeaderProps) {
	const { userInfo } = useAppSelector((state) => state.auth);
	const handleNavbarClick = useCallback(async (nav: Nav) => {
		setConversations([]);
		if (nav === Nav.DIRECT) {
			try {
				await axiosPrivate.get(`/chat/direct`)
					.then(response => {
						if (response.status === 200) {
							setConversations(response.data);
						} else {
							window.location.href = '/error';
							// window.location.reload();
						}
					})
					.catch(error => {
						window.location.href = '/error';
						// window.location.reload();
					});
			} catch (err) {
				setConversations([]);
			}
			try {
				await axiosPrivate.get(
					`/users/friends/${user.id}`
				).then(response => {
					if (response.status === 200) {
						setResults(response.data);
					} else {
						window.location.href = '/error';
						// window.location.reload();
					}
				})
					.catch(error => {
						window.location.href = '/error';
						// window.location.reload();
					});
			} catch (err) {
				window.location.href = '/error';
				// window.location.reload();
			}
		} else if (nav === Nav.GROUPS) {
			try {
				await axiosPrivate.get(`/chat/groups`)
					.then(response => {
						if (response.status === 200) {
							setConversations(response.data);
						} else {
							window.location.href = '/error';
							// window.location.reload();
						}
					})
					.catch(error => {
						window.location.href = '/error';
						// window.location.reload();
					});
				setConversation(null);
			} catch (err) {
				setConversations([]);
			}
		} else if (nav === Nav.EXPLORE) {
			try {
				await axiosPrivate.get(`/chat/explore`)
					.then(response => {
						if (response.status === 200) {
							setConversations(response.data);
						} else {
							window.location.href = '/error';
							// window.location.reload();
						}
					})
					.catch(error => {
						window.location.href = '/error';
						// window.location.reload();
					});
			} catch (err) {
				setConversations([]);
			}
		}
		setNavbar(nav);
	}, [setConversations, setResults, setNavbar, user, setConversation]);

	const setConversationsObject = async () => {
		try {
			await axiosPrivate.get(`/chat/groups`)
				.then(response => {
					if (response.status === 200) {
						setConversations(response.data);
						setMessages([]);
						setConversation(null);
						setConversationID(null);
					} else {
						window.location.href = '/error';
						// window.location.reload();
					}
				})
				.catch(error => {
					window.location.href = '/error';
					// window.location.reload();
				});
		} catch (err) {
			setConversations([]);
		}
	}
	const setExploreConversationsObject = async () => {
		try {
			await axiosPrivate.get(`/chat/explore`).then(response => {
				if (response.status === 200) {
					setConversations(response.data);
					setMessages([]);
					setConversation(null);
					setConversationID(null);
				} else {
					window.location.href = '/error';
					// window.location.reload();
				}
			})
				.catch(error => {
					window.location.href = '/error';
					// window.location.reload();
				});
		} catch (err) {
			setConversations([]);
		}
	}

	const handleSetConversationObject = useCallback(
		setConversationsObject,
		[setConversations, setMessages, setConversation, setConversationID]
	);

	const handleSetExploreConversationObject = useCallback(
		setExploreConversationsObject,
		[setConversations, setMessages, setConversation, setConversationID]
	);

	useEffect(() => {
		if (user && user !== undefined) {
			handleNavbarClick(Navbar);
		}
	}, [Navbar, user, handleNavbarClick]);

	useEffect(() => {
		const handlePasswordAdded = async (object: any) => {
			if (object.userID === userInfo.id) {
				handleSetConversationObject();
			}
		};
		const handlePasswordRemoved = async (object: any) => {
			if (object.userID === userInfo.id) {
				handleSetConversationObject();
			}
		};
		const handleUserKicked = async (object: any) => {
			if (object.kickedUserID === userInfo.id) {
				handleSetConversationObject();
			}
		};
		const handleUserUnbanned = async (object: any) => {
			if (object.unbannedUserID === userInfo.id) {
				handleSetConversationObject();
			}
		};
		const handleUserBanned = async (object: any) => {
			if (object.bannedUserID === userInfo.id) {
				handleSetConversationObject();
			}
		};
		const handleConversationLeft = async (object: any) => {
			if (object.userID === userInfo.id) {
				handleSetConversationObject();
				setConversationID(null);
				setMessages([]);
				setConversation(null);
			}
		};
		const handleConversationJoined = async (object: any) => {
			if (object.userID === userInfo.id) {
				handleSetExploreConversationObject();
			}
		};
		const handleUserMuted = async (object: any) => {
			if (object != null && object.mutedUserID !== null && object.mutedUserID === userInfo.id) {
				handleSetConversationObject();
			}
		};
		const handleAdminMade = async (object: any) => {
			if (object.userID === object.admin) {
				handleSetConversationObject();
			}
		};

		socket?.on('adminMade', handleAdminMade);
		socket?.on('userMuted', handleUserMuted);
		socket?.on('userKicked', handleUserKicked);
		socket?.on('userUnbanned', handleUserUnbanned);
		socket?.on('userBanned', handleUserBanned);
		socket?.on('conversationLeft', handleConversationLeft);
		socket?.on('conversationJoined', handleConversationJoined);
		socket?.on('conversationProtected', handlePasswordAdded);
		socket?.on('passwordRemoved', handlePasswordRemoved);

		return () => {
			socket?.off('adminMade', handleAdminMade);
			socket?.off('userMuted', handleUserMuted);
			socket?.off('userKicked', handleUserKicked);
			socket?.off('userUnbanned', handleUserUnbanned);
			socket?.off('userBanned', handleUserBanned);
			socket?.off('conversationLeft', handleConversationLeft);
			socket?.on('conversationJoined', handleConversationJoined);
			socket?.off('conversationProtected', handlePasswordAdded);
			socket?.off('passwordRemoved', handlePasswordRemoved);
		};
	}, [socket, user, handleSetConversationObject, setConversationID, setMessages, setConversation, userInfo, handleSetExploreConversationObject]);

	return (
		<>
			<ParentMessageNav>
				<StyledHiOutlineUser
					onClick={() => handleNavbarClick(Nav.DIRECT)}
					color={Navbar === Nav.DIRECT ? Colors.WHITE : Colors.PRIMARY}
					size={30}
				/>
				<StyledHiOutlineUserGroup
					onClick={() => handleNavbarClick(Nav.GROUPS)}
					color={Navbar === Nav.GROUPS ? Colors.WHITE : Colors.PRIMARY}
					size={30}
				/>
				<StyledBiCommentAdd
					onClick={() => handleNavbarClick(Nav.CREATE)}
					color={Navbar === Nav.CREATE ? Colors.WHITE : Colors.PRIMARY}
					size={30}
				/>
				<StyledMdOutlineTravelExplore
					onClick={() => handleNavbarClick(Nav.EXPLORE)}
					color={Navbar === Nav.EXPLORE ? Colors.WHITE : Colors.PRIMARY}
					size={30}
				/>
			</ParentMessageNav>
		</>
	);
};

export default LeftSideHeader;
