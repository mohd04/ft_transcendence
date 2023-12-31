import React, { useEffect, useState } from "react";
import { Colors, Nav, Privacy } from "../../chat.functions";
import { Button, Input, List, Pagination } from "antd";
import { LockOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';

interface ExploreChatProps {
	socket: any;
	conversations: Conversation[];
	Navbar: Nav;
}

interface Conversation {
	id: string;
	title: string;
	privacy: "PUBLIC" | "PROTECTED" | "PRIVATE";
}

const ExploreChat = ({
	socket,
	conversations,
	Navbar,
}: ExploreChatProps) => {
	const [selectedConversationID, setSelectedConversationID] = React.useState("");
	const [password, setPassword] = useState('');
	const [menuVisible, setMenuVisible] = useState(false);
	const [searchText, setSearchText] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);

	const filterResults = (data: Conversation[], searchText: string) => {
		if (!searchText) {
			return data;
		}
		return data.filter((item) => item.title.toLowerCase().includes(searchText.toLowerCase()));
	};

	function handleSelectedConversation(conversation: any) {
		setSelectedConversationID(conversation.id);
		if (conversation.privacy === "PUBLIC") {
			socket?.emit("joinConversation", { conversationID: conversation.id, password: "" });
		}
		else if (conversation.privacy === "PROTECTED") {
			setMenuVisible(menuVisible === false ? true : false);
		}
	}

	function handleProtectedConversation(conversation: any, password: string) {
		socket?.emit("joinConversation", { conversationID: conversation.id, password: password });
		setPassword('');
		setMenuVisible(false);
	}

	useEffect(() => {
		setMenuVisible(false);
	}, [conversations]);

	return (
		<>
			<Input.Search
				placeholder="Search Conversations"
				value={searchText}
				onChange={(e) => setSearchText(e.target.value)}
			/>
			<List
				itemLayout="horizontal"
				locale={{ emptyText: "No conversations found" }}
				dataSource={filterResults(conversations, searchText).slice((currentPage - 1) * pageSize, currentPage * pageSize)}
				renderItem={(conversation) => (
					<>
						<List.Item
							onClick={() => handleSelectedConversation(conversation)}
							style={{
								border: (selectedConversationID !== conversation.id) ? Colors.PRIMARY : Colors.SECONDARY + ' 1px solid',
								transition: 'border 0.2s ease-in-out',
								cursor: 'pointer',
								paddingLeft: '.5rem',
								borderRadius: '.5rem',
								color: 'white',
								marginBottom: '.65rem',
								padding: '.75rem'
							}}
						>
							<List.Item.Meta
								title={
									<span style={{ color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
										<div style={{ width: '10rem' }}>
											{conversation.title}
										</div>
										<div style={{ width: '5rem', display: 'flex', justifyContent: 'right' }}>
											{
												conversation !== undefined && conversation.privacy === 'PUBLIC'
													? <EyeOutlined /> : conversation.privacy === 'PROTECTED'
														? <LockOutlined /> : conversation.privacy === 'PRIVATE'
															? <EyeInvisibleOutlined /> : null
											}

										</div>
									</span>
								}
							/>
						</List.Item>
						{selectedConversationID === conversation.id &&
							conversation.privacy === Privacy.PROTECTED &&
							menuVisible && (
								<div style={{ marginTop: "10px", paddingLeft: "20px" }}>
									<Input
										placeholder="Enter password"
										style={{ width: "50%" }}
										value={password}
										type="password"
										onChange={(e) => setPassword(e.target.value)}
										onKeyDown={(event) => {
											if (event.key === 'Enter') {
												handleProtectedConversation(conversation, password)
											}
										}}
									/>
									<Button
										type="primary"
										style={{ marginLeft: "10px" }}
										onClick={() =>
											handleProtectedConversation(conversation, password)
										}
									>
										Join
									</Button>
								</div>
							)}
					</>
				)}
			/>
			<Pagination
				current={currentPage}
				pageSize={pageSize}
				total={filterResults(conversations, searchText).length}
				onChange={(page, pageSize) => {
					setCurrentPage(page);
					setPageSize(pageSize);
				}}
				style={{display: "flex", justifyContent: "center", alignItems: "flex-end", marginTop: "1rem"}}
			/>
		</>
	);
};

export default ExploreChat;
