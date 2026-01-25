import os
import dashscope
from dashscope.aigc.image_generation import ImageGeneration
from dashscope.api_entities.dashscope_response import Message

# 以下为北京地域url，各地域的base_url不同
dashscope.base_http_api_url = 'https://dashscope.aliyuncs.com/api/v1'

# 若没有配置环境变量，请用百炼API Key将下行替换为：api_key="sk-xxx"
# 各地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
api_key = os.getenv("DASHSCOPE_API_KEY")

message = Message(
    role="user",
    content=[
        {
            'text': '一间有着精致窗户的花店，漂亮的木质门，摆放着花朵'
        }
    ]
)
print("----sync call, please wait a moment----")
rsp = ImageGeneration.call(
    model="wan2.6-t2i",
    api_key=api_key,
    messages=[message],
    negative_prompt="",
    prompt_extend=True,
    watermark=False,
    n=1,
    size="1280*1280"
)
print(rsp)