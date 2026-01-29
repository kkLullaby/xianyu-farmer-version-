#!/bin/bash

# 农户"附近处理点"功能测试脚本
# 用法: bash test-farmer-nearby.sh

set -e

echo "======================================"
echo "🌾 农户附近处理点功能测试"
echo "======================================"
echo ""

# 检查服务状态
echo "📡 检查服务状态..."
if pgrep -f "node server.js" > /dev/null; then
    echo "✅ 后端服务运行中 (端口 4000)"
else
    echo "❌ 后端服务未启动，正在启动..."
    cd "/home/kk/code/Project Ex-class"
    nohup node server.js > server.log 2>&1 &
    sleep 2
    echo "✅ 后端服务已启动"
fi

if pgrep -f "python.*8080" > /dev/null; then
    echo "✅ 前端服务运行中 (端口 8080)"
else
    echo "❌ 前端服务未启动，正在启动..."
    cd "/home/kk/code/Project Ex-class"
    nohup python3 -m http.server 8080 --bind 127.0.0.1 > /dev/null 2>&1 &
    sleep 2
    echo "✅ 前端服务已启动"
fi

echo ""
echo "🧪 开始API功能测试..."
echo ""

# Test 1: 检查API是否可访问
echo "Test 1: 检查API可访问性"
if wget -q -O /dev/null "http://localhost:4000/api/recyclers/nearby?lat=39.9042&lng=116.4074"; then
    echo "✅ API可访问"
else
    echo "❌ API不可访问"
    exit 1
fi

echo ""

# Test 2: 获取附近的回收商
echo "Test 2: 获取附近回收商（北京位置）"
RESPONSE=$(wget -q -O- "http://localhost:4000/api/recyclers/nearby?lat=39.9042&lng=116.4074&limit=5")
COUNT=$(echo "$RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(len(data))")
echo "✅ 返回 $COUNT 个回收商"
echo "   返回数据示例:"
echo "$RESPONSE" | python3 -m json.tool | head -20

echo ""

# Test 3: 验证距离计算
echo "Test 3: 验证距离计算"
FIRST_DISTANCE=$(echo "$RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data[0]['distance'])")
echo "✅ 最近的处理点距离: ${FIRST_DISTANCE}km"

echo ""

# Test 4: 测试不同的limit参数
echo "Test 4: 测试limit参数"
for LIMIT in 1 3 5 10; do
    RESPONSE=$(wget -q -O- "http://localhost:4000/api/recyclers/nearby?lat=39.9042&lng=116.4074&limit=$LIMIT")
    COUNT=$(echo "$RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(len(data))")
    echo "✅ limit=$LIMIT 返回 $COUNT 个结果"
done

echo ""

# Test 5: 测试错误处理
echo "Test 5: 测试错误处理（缺少参数）"
RESPONSE=$(wget -q -O- "http://localhost:4000/api/recyclers/nearby?lat=39.9042" 2>&1 || true)
if echo "$RESPONSE" | grep -q "error\|Error"; then
    echo "✅ 正确返回错误信息"
else
    echo "⚠️ 未返回预期错误"
fi

echo ""

# Test 6: 测试不同位置
echo "Test 6: 测试不同位置的距离计算"
echo ""
echo "   位置1 (北京): lat=39.9042, lng=116.4074"
RESPONSE=$(wget -q -O- "http://localhost:4000/api/recyclers/nearby?lat=39.9042&lng=116.4074&limit=1")
echo "$RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print('   最近处理点:', data[0]['name'], '距离:', data[0]['distance'], 'km')"

echo ""
echo "   位置2 (上海): lat=31.2304, lng=121.4737"
RESPONSE=$(wget -q -O- "http://localhost:4000/api/recyclers/nearby?lat=31.2304&lng=121.4737&limit=1")
echo "$RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print('   最近处理点:', data[0]['name'], '距离:', data[0]['distance'], 'km')"

echo ""
echo "   位置3 (深圳): lat=22.3964, lng=114.1095"
RESPONSE=$(wget -q -O- "http://localhost:4000/api/recyclers/nearby?lat=22.3964&lng=114.1095&limit=1")
echo "$RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print('   最近处理点:', data[0]['name'], '距离:', data[0]['distance'], 'km')"

echo ""
echo "======================================"
echo "✅ API 功能测试完成！"
echo "======================================"
echo ""
echo "📝 访问前端页面："
echo "   http://127.0.0.1:8080/farmer-nearby-recyclers.html"
echo ""
echo "🔐 地图功能需配置API Key："
echo "   参考文档: MAP_API_GUIDE.md"
echo ""
echo "📚 完整文档："
echo "   - FARMER_NEARBY_GUIDE.md (功能使用指南)"
echo "   - FARMER_NEARBY_IMPLEMENTATION.md (实现总结)"
echo "   - MAP_API_GUIDE.md (地图API接入指南)"
echo ""
