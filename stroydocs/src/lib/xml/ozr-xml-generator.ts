/**
 * Генератор XML для ОЖР (Общий журнал работ)
 * по схеме Минстроя (ГОСТ Р 70108-2025)
 */

import { create } from 'xmlbuilder2';
import { formatDateXml, PARTICIPANT_ROLE_LABELS_RU } from './xml-utils';
import type { ExecutionDocForXml } from './xml-utils';

/**
 * Генерирует XML-строку ОЖР по схеме Минстроя.
 * Включает: реквизиты, объект, договор, участники.
 * Записи журнала берутся из связанного workRecord (если есть).
 */
export function generateOzrXml(doc: ExecutionDocForXml): string {
  const { contract } = doc;
  const obj = contract.buildingObject;

  const root = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('OZR', { 'xmlns': 'urn:minstroyrf:ozr:1.0' });

  // Реквизиты журнала
  root.ele('Номер').txt(doc.number).up();
  root.ele('Дата').txt(formatDateXml(doc.createdAt)).up();
  root.ele('Статус').txt(doc.status).up();

  // Объект строительства
  const objNode = root.ele('Объект');
  objNode.ele('Наименование').txt(obj.name).up();
  objNode.ele('Адрес').txt(obj.address ?? '').up();
  if (obj.cadastralNumber) {
    objNode.ele('КадастровыйНомер').txt(obj.cadastralNumber).up();
  }
  objNode.up();

  // Договор
  const contractNode = root.ele('Договор');
  contractNode.ele('Номер').txt(contract.number).up();
  contractNode.ele('Наименование').txt(contract.name).up();
  contractNode.up();

  // Участники строительства
  if (contract.participants.length > 0) {
    const participantsNode = root.ele('Участники');
    for (const p of contract.participants) {
      const pNode = participantsNode.ele('Участник', {
        роль: PARTICIPANT_ROLE_LABELS_RU[p.role] ?? p.role,
      });
      pNode.ele('Организация').txt(p.organization.name).up();
      if (p.organization.inn) {
        pNode.ele('ИНН').txt(p.organization.inn).up();
      }
      if (p.organization.ogrn) {
        pNode.ele('ОГРН').txt(p.organization.ogrn).up();
      }
      if (p.representativeName) {
        pNode.ele('Представитель').txt(p.representativeName).up();
      }
      if (p.position) {
        pNode.ele('Должность').txt(p.position).up();
      }
      pNode.up();
    }
    participantsNode.up();
  }

  // Запись журнала (если привязана к WorkRecord)
  if (doc.workRecord) {
    const wr = doc.workRecord;
    const recordsNode = root.ele('Записи');
    const recNode = recordsNode.ele('Запись');
    recNode.ele('Дата').txt(formatDateXml(wr.date)).up();
    recNode.ele('Работа').txt(wr.workItem.name).up();
    recNode.ele('Место').txt(wr.location).up();
    if (wr.normative) {
      recNode.ele('Нормативы').txt(wr.normative).up();
    }
    if (wr.description) {
      recNode.ele('Описание').txt(wr.description).up();
    }
    recNode.up();
    recordsNode.up();
  }

  // Подписи
  if (doc.signatures.length > 0) {
    const signaturesNode = root.ele('Подписи');
    for (const sig of doc.signatures) {
      const sigNode = signaturesNode.ele('Подпись');
      sigNode.ele('ФИО').txt(
        [sig.user.lastName, sig.user.firstName, sig.user.middleName].filter(Boolean).join(' ')
      ).up();
      sigNode.ele('Дата').txt(formatDateXml(sig.signedAt)).up();
      sigNode.up();
    }
    signaturesNode.up();
  }

  root.up();
  return root.end({ prettyPrint: true });
}
