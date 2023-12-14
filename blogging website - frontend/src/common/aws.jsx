import axios from "axios";

export const uploadImage = async (img) => {
    try {
        const response = await axios.get(import.meta.env.VITE_SERVER_DOMAIN + "/get-upload-url");
        const { uploadURL } = response.data;

        await axios.put(uploadURL, img, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });

        const imgUrl = uploadURL.split("?")[0];
        return imgUrl;
    } catch (error) {
        console.error("Error uploading image:", error);
        throw error; // Rethrow the error to be caught by the calling code
    }
};
