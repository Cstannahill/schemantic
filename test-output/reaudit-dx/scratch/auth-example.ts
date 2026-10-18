import { DXProbeApiClient } from "./configured";
const client = new DXProbeApiClient({baseUrl:"http://localhost"});
client.setDefaultHeader("Authorization", "Bearer token");
client.removeDefaultHeader("Authorization");
