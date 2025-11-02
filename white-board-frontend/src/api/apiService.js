import axios from "axios"

const apiClient = axios.create({
  baseURL: "http://127.0.0.1:8000/api/",
});

// --------- Interceptor to add the Auth token to each request ---------
// This checks if we have a token saved in local storage and adds it to the headers of each request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --------- Authentication Functions ---------
// * Function login(username, password)
// * Makes a POST request to your token endpoint.

export const login = async (username, password) => {
  try {
    const response = await apiClient.post("/token/", { username, password });

    if (response.data.access) {
      localStorage.setItem("accessToken", response.data.access);
    }
    return response.data;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

export const logout = () => {
  localStorage.removeItem("accessToken");
};

// --------- WhiteBoard Functions ---------

/**
Function getWhiteboards()
 * Makes a GET request to the /whiteboards/ endpoint.
 * Returns the list of whiteboards.
*/
export const getWhiteboards = async () => {
  try {
    const response = await apiClient.get("/whiteboards/");
    return response.data;
  } catch (error) {
    console.error("Error fetching whiteboards:", error);
    throw error;
  }
};

//  * Function createWhiteboard(name)
//  * Makes a POST request to the /whiteboards/ endpoint
export const createWhiteboard = async (name) => {
  try {
    console.log("Creating whiteboard with name:", name);
    const response = await apiClient.post("/whiteboards/", { name });
    return response.data;
  } catch (error) {
    console.error("Error creating whiteboard:", error);
    throw error;
  }
};

export const getWhiteboardDetails = async (id) => {
  try {
    const response = await apiClient.get(`/whiteboards/${id}/`);
    return response.data;
  }
  catch (error) {
    console.error(`Error fetching whiteboard details:${id}`, error);
    throw error;
  } 
}