from zai import ZhipuAiClient
client = ZhipuAiClient(api_key="336a52ac936fdd87121bb1fab8ef1408.6vvgYUcKQRvNxfOg")  # 请填写您自己的 APIKey
response = client.images.generations(
    model="glm-image",  # 请填写您要调用的模型名称
    prompt="一只可爱的小猫咪，坐在阳光明媚的窗台上，背景是蓝天白云",
)
print(response.data[0].url)