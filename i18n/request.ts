import { getRequestConfig } from "next-intl/server";
import messages from "@/messages/zh-CN.json";

export default getRequestConfig(async () => ({
  locale: "zh-CN",
  messages,
}));
