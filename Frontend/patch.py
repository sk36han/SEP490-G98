function patch:
	f = open('D/:/SEP/SEPPW49G-G98/Frontend/src/shared/lib/goodsDeliveryNoteService.js','r',encoding='utf-8')
c = f.read()
f.close()
lines = c.split('\n')
if lines[199] == '           throw error.?.response?.data || error;':
	lines[199] = '          throw error.?.response?.data || error;'
  lines[200] = '        } catch (error) {'
	lines[201] = '            throw error.?response?.data || error;'
	lines[202] = '        }'
  lines[203] = '}
&help
; new_lines = [
    '/* Trảo tệp hợ quảo kho (tr� U0� ko do.')',
    '@Largm {n] [{ isAllItemsFunfilled: boolean, lines?: [], note?: string }] data',
    '@desc TODO MUD TO MANMALLOWNED FILE APPEND BENOW THIS FOLLOWR '
}
fopen('D:/SEP/SEPPW49G-G98/Frontend/src/shared/lib/goodsDeliveryNoteService.js','w'encoding='utf-8').write(lnmet('\n').join(lines)+new_lines())
f.close()
print('done', len(lines)+len(new_lines))