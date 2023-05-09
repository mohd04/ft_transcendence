import { useEffect, useState } from "react";
import { LeftSideContainer, MessageBoxContainer, ParentContainer, RightSideContainer } from "./chat.styled";
import { GNav, Nav, Status, User } from "./chat.functions";
import { UserProfilePicture } from "../../assets";
import LeftSideDiv from "./LeftSideDiv";
import MessageDiv from "./MessageDiv";
import RightSideDiv from "./RightSideDiv";
import { ErrorAlert, SuccessAlert } from "../toastify/index";

interface ChatProps {
	socket: any;
	user: any;
}

const Chat = ({
	socket,
	user,
}: ChatProps) => {
	const [Navbar, setNavbar] = useState(Nav.DIRECT);
	const [conversationID, setConversationID] = useState(null);
	const [conversations, setConversations] = useState([]);
	const [messages, setMessages] = useState([]);
	const [status, setStatus] = useState(Status.ACTIVE); // you need to set this for if you are selecting any conversation in group
	const [conversation, setConversation] = useState(null);
	const [results, setResults] = useState<User[]>([]);
	const [groupResults, setGroupResults] = useState<User[]>([]);
	const [groupNav, setGroupNav] = useState(GNav.GROUPS);

	useEffect(() => {
		socket?.on('exception', (error) => {
			ErrorAlert(error.error, 5000);
			console.log(error);
		});
		return () => {
			socket?.off('exception');
		};
	}, [socket]);

	useEffect(() => {
		socket?.on('conversationCreated', () => {
			SuccessAlert("Conversation Created", 5000);
		});
		return () => {
			socket?.off('conversationCreated');
		};
	}, [socket]);

	return (
		<>
			<ParentContainer>
				<LeftSideContainer>
					<LeftSideDiv
						user={user}
						socket={socket}
						Navbar={Navbar}
						setNavbar={setNavbar}
						conversations={conversations}
						conversationID={conversationID}
						setConversationID={setConversationID}
						UserProfilePicture={UserProfilePicture}
						setConversations={setConversations}
						setMessages={setMessages}
						setConversation={setConversation}
						setStatus={setStatus}
						conversation={conversation}
						setResults={setResults}
						setGroupResults={setGroupResults}
						setGroupNav={setGroupNav}
					/>
				</LeftSideContainer>
				<MessageBoxContainer>
					{(status === Status.ACTIVE || status === Status.MUTED) && (
						<MessageDiv
							user={user}
							socket={socket}
							messages={messages}
							setMessages={setMessages}
							conversationID={conversationID}
						/>
					)}
				</MessageBoxContainer>
				<RightSideContainer>
					<RightSideDiv
						socket={socket}
						Navbar={Navbar}
						conversationID={conversationID}
						conversation={conversation}
						results={results}
						groupResults={groupResults}
						setGroupResults={setGroupResults}
						setGroupNav={setGroupNav}
						groupNav={groupNav}
					/>
				</RightSideContainer>
			</ParentContainer>
		</>
	);
};

export default Chat;
