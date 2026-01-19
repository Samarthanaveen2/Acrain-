import streamlit as st

st.title("Samartha's Academic Brain - v0.1 🚀")
st.write("Standalone Mac app coming soon. This is the test.")

query = st.text_input("Test AI command (e.g., add physics notes by 5:30pm tomorrow):")
if st.button("Send"):
    st.write("AI response: Task added (full version soon).")

uploaded = st.file_uploader("Upload PDFs", type="pdf", accept_multiple_files=True)
if uploaded:
    st.write(f"Uploaded {len(uploaded)} files - processing ready!")
