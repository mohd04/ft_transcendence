import styled from "styled-components";

export const HomeContainer = styled.form`
  width: 100%;
  height: 100%;
  padding: 3rem 2rem;
  background: var(--main-800);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

export const HomeDetails = styled.div`
  width: 100%;
  max-width: 373px;
`;

export const HomeTitle = styled.div`
  text-align: center;
  font-weight: 600;
  font-size: 2.25rem;
  line-height: 30px;
  padding-right: 10px;
  /* border-right: 1px solid #000; */
  letter-spacing: 1px;
  margin-bottom: 3rem;
`;