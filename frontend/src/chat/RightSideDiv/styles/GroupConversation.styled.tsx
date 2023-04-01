import styled, { css }  from "styled-components";

interface ContactDivProps {
	backgroundColor: string;
	isOpen: boolean;
}
// create a styled div component that'll render a contact div
export const ContactDiv = styled.div<ContactDivProps>`
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  height: 70px;
  border-radius: 10px;
  margin-top: 10px;
  border: 2px solid #00A551;
  background: ${({ backgroundColor }) => backgroundColor};
  ${({ isOpen }) =>
  isOpen &&
  css`
	border-bottom-left-radius: 0;
	border-bottom-right-radius: 0;
  `}
`;

export const ContactImage = styled.img`
  width: 50px;
  height: 50px;
  margin-right: 5px;
  border-radius: 50%;
  padding: 10px;
`;

export const ContactName = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-left: 10px;
  color: white;
  font-size: 1em;
  width: 45%;
  height: 50px;
`;