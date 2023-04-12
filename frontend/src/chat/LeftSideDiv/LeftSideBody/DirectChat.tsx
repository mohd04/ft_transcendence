import React, { useEffect, useState } from "react";
import { ContactDiv, ContactImage, ContactName, DropdownField, StyledTiLockClosed, StyledTiLockOpen } from "./LeftSideBody.styled";
import { Nav, Privacy, Colors } from "../../chat.functions";

interface DirectChatProp {
	conversations: any;
	UserProfilePicture: any;
	selectedConversationID: any;
	setSelectedConversationID: any;
}

const DirectChat = ({
	conversations,
	UserProfilePicture,
	selectedConversationID,
	setSelectedConversationID,
}: DirectChatProp) => {

	function handleSelectedConversation(conversation: any) {
		setSelectedConversationID(conversation.id);
	}
	return (
		<>
			{
				conversations.map((c) => {
					if (c) {
						return (
							<React.Fragment key={c.id}>
								<ContactDiv key={c.id} onClick={() => handleSelectedConversation(c)} backgroundColor={selectedConversationID === c.id ? Colors.SECONDARY : Colors.PRIMARY}>
									<ContactImage src={UserProfilePicture} alt="" />
									<ContactName>{c.participants[0].user.username}</ContactName>
								</ContactDiv>
							</React.Fragment>
						);
					}
				})
			}
		</>
	);
}

export default DirectChat;